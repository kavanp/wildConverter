"""
WildConverter - Python Backend
A comprehensive file conversion server supporting multiple formats.
"""

import os
import io
import json
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Image Processing
from PIL import Image

# PDF Processing
from pdf2docx import Converter as Pdf2DocxConverter
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import pdfplumber

# Document Processing
from docx import Document
from docx.shared import Inches, Pt
import mammoth

# Data Format Processing
import pandas as pd
import xmltodict
import yaml
import csv

# Markdown Processing
import markdown

# File Type Detection
import filetype

# Audio Processing
from pydub import AudioSegment

# Video Processing
from moviepy.editor import VideoFileClip, AudioFileClip

# Archive Processing
import zipfile
import tarfile
import py7zr

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuration
UPLOAD_FOLDER = tempfile.mkdtemp()
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Supported formats
IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'ico']
DOCUMENT_FORMATS = ['pdf', 'docx', 'doc', 'txt', 'html', 'md', 'rtf']
DATA_FORMATS = ['csv', 'json', 'xml', 'yaml', 'yml', 'xlsx', 'xls']
AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma']
VIDEO_FORMATS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'gif']
ARCHIVE_FORMATS = ['zip', 'tar', 'tar.gz', 'tgz', '7z']


def get_file_extension(filename):
    """Get lowercase file extension, handling compound extensions like .tar.gz"""
    filename_lower = filename.lower()
    # Check for compound extensions first
    if filename_lower.endswith('.tar.gz'):
        return 'tar.gz'
    if filename_lower.endswith('.tar.bz2'):
        return 'tar.bz2'
    return Path(filename).suffix.lower().lstrip('.')


def detect_file_type(file_buffer, filename):
    """Detect file type from buffer or filename."""
    kind = filetype.guess(file_buffer)
    if kind:
        return kind.extension
    return get_file_extension(filename)


# ============ IMAGE CONVERSIONS ============

def convert_image(input_buffer, input_format, output_format):
    """Convert between image formats using Pillow."""
    img = Image.open(io.BytesIO(input_buffer))

    # Handle transparency for formats that don't support it
    if output_format.lower() in ['jpg', 'jpeg', 'bmp'] and img.mode in ['RGBA', 'P']:
        # Create white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
        img = background
    elif output_format.lower() in ['jpg', 'jpeg'] and img.mode != 'RGB':
        img = img.convert('RGB')

    output = io.BytesIO()

    # Format-specific options
    save_kwargs = {}
    if output_format.lower() in ['jpg', 'jpeg']:
        save_kwargs['quality'] = 95
        save_kwargs['format'] = 'JPEG'
    elif output_format.lower() == 'png':
        save_kwargs['format'] = 'PNG'
    elif output_format.lower() == 'webp':
        save_kwargs['quality'] = 95
        save_kwargs['format'] = 'WEBP'
    elif output_format.lower() == 'gif':
        save_kwargs['format'] = 'GIF'
    elif output_format.lower() == 'bmp':
        save_kwargs['format'] = 'BMP'
    elif output_format.lower() == 'tiff':
        save_kwargs['format'] = 'TIFF'
    elif output_format.lower() == 'ico':
        save_kwargs['format'] = 'ICO'
    else:
        save_kwargs['format'] = output_format.upper()

    img.save(output, **save_kwargs)
    output.seek(0)
    return output.getvalue()


def image_to_pdf(input_buffer):
    """Convert image to PDF using ReportLab."""
    img = Image.open(io.BytesIO(input_buffer))

    # Get image dimensions
    img_width, img_height = img.size

    output = io.BytesIO()
    c = canvas.Canvas(output, pagesize=(img_width, img_height))

    # Convert image for ReportLab
    img_reader = ImageReader(io.BytesIO(input_buffer))
    c.drawImage(img_reader, 0, 0, width=img_width, height=img_height)
    c.save()

    output.seek(0)
    return output.getvalue()


# ============ PDF CONVERSIONS ============

def pdf_to_docx(input_buffer):
    """Convert PDF to DOCX using pdf2docx."""
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
        pdf_file.write(input_buffer)
        pdf_path = pdf_file.name

    docx_path = pdf_path.replace('.pdf', '.docx')

    try:
        cv = Pdf2DocxConverter(pdf_path)
        cv.convert(docx_path)
        cv.close()

        with open(docx_path, 'rb') as f:
            result = f.read()

        return result
    finally:
        # Cleanup
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
        if os.path.exists(docx_path):
            os.unlink(docx_path)


def pdf_to_text(input_buffer):
    """Extract text from PDF using pdfplumber."""
    text_content = []

    with pdfplumber.open(io.BytesIO(input_buffer)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)

    return '\n\n'.join(text_content).encode('utf-8')


def pdf_to_image(input_buffer, output_format='png', page_num=0):
    """Convert first page of PDF to image."""
    # This requires pdf2image which needs poppler
    # Fallback: use PyMuPDF if available, or return error
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=input_buffer, filetype="pdf")
        page = doc[page_num]

        # Render at 2x resolution
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)

        img_data = pix.tobytes("png")

        if output_format.lower() in ['jpg', 'jpeg']:
            # Convert PNG to JPEG
            img = Image.open(io.BytesIO(img_data))
            output = io.BytesIO()
            img.convert('RGB').save(output, 'JPEG', quality=95)
            output.seek(0)
            return output.getvalue()

        return img_data
    except ImportError:
        raise Exception("PDF to image conversion requires PyMuPDF. Install with: pip install PyMuPDF")


# ============ DOCX CONVERSIONS ============

def docx_to_pdf(input_buffer):
    """Convert DOCX to PDF using LibreOffice."""
    import subprocess
    import platform

    # Create temp files
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as docx_file:
        docx_file.write(input_buffer)
        docx_path = docx_file.name

    # Get the directory for output
    output_dir = os.path.dirname(docx_path)

    try:
        # Find LibreOffice executable
        # if platform.system() == 'Windows':
        #     # Common Windows paths for LibreOffice
        #     possible_paths = [
        #         r'C:\Program Files\LibreOffice\program\soffice.exe',
        #         r'C:\Program Files (x86)\LibreOffice\program\soffice.exe',
        #         'soffice'  # If in PATH
        #     ]
        #     soffice_path = None
        #     for path in possible_paths:
        #         if os.path.exists(path) or path == 'soffice':
        #             soffice_path = path
        #             break
        #     if not soffice_path:
        #         raise Exception("LibreOffice not found. Please install LibreOffice from https://www.libreoffice.org/download/download/")
        # else:
        #     # Linux/Mac
        soffice_path = 'soffice'

        # Run LibreOffice conversion
        cmd = [
            soffice_path,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', output_dir,
            docx_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            raise Exception(f"LibreOffice conversion failed: {result.stderr}")

        # Find the output PDF file
        pdf_path = docx_path.replace('.docx', '.pdf')

        if not os.path.exists(pdf_path):
            # Try with the original filename
            base_name = os.path.basename(docx_path).replace('.docx', '.pdf')
            pdf_path = os.path.join(output_dir, base_name)

        if not os.path.exists(pdf_path):
            raise Exception("PDF output file not found after conversion")

        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()

        return pdf_content

    finally:
        # Cleanup temp files
        if os.path.exists(docx_path):
            os.unlink(docx_path)
        pdf_path = docx_path.replace('.docx', '.pdf')
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)


def docx_to_text(input_buffer):
    """Extract text from DOCX using mammoth."""
    result = mammoth.extract_raw_text(io.BytesIO(input_buffer))
    return result.value.encode('utf-8')


def docx_to_html(input_buffer):
    """Convert DOCX to HTML using mammoth."""
    result = mammoth.convert_to_html(io.BytesIO(input_buffer))

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body {{
            font-family: 'Times New Roman', Times, serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }}
        img {{ max-width: 100%; height: auto; }}
        table {{ border-collapse: collapse; margin: 1em 0; width: 100%; }}
        td, th {{ border: 1px solid #ddd; padding: 8px; }}
    </style>
</head>
<body>
{result.value}
</body>
</html>"""
    return html.encode('utf-8')


# ============ TEXT/MARKDOWN CONVERSIONS ============

def markdown_to_html(input_buffer):
    """Convert Markdown to HTML."""
    md_text = input_buffer.decode('utf-8')
    html_content = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }}
        pre {{ background: #f5f5f5; padding: 1rem; overflow-x: auto; border-radius: 4px; }}
        code {{ background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }}
        blockquote {{ border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }}
        table {{ border-collapse: collapse; margin: 1em 0; }}
        td, th {{ border: 1px solid #ddd; padding: 8px; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
    return html.encode('utf-8')


def text_to_pdf(input_buffer):
    """Convert plain text to PDF using ReportLab."""
    text = input_buffer.decode('utf-8')

    output = io.BytesIO()
    c = canvas.Canvas(output, pagesize=A4)
    width, height = A4

    # Set font
    c.setFont("Helvetica", 11)

    # Margins
    margin = 72  # 1 inch
    line_height = 14
    y = height - margin

    # Split text into lines
    for line in text.split('\n'):
        # Word wrap
        words = line.split()
        current_line = ""

        for word in words:
            test_line = current_line + " " + word if current_line else word
            if c.stringWidth(test_line, "Helvetica", 11) < width - 2 * margin:
                current_line = test_line
            else:
                if current_line:
                    c.drawString(margin, y, current_line)
                    y -= line_height
                    if y < margin:
                        c.showPage()
                        c.setFont("Helvetica", 11)
                        y = height - margin
                current_line = word

        if current_line:
            c.drawString(margin, y, current_line)
            y -= line_height
            if y < margin:
                c.showPage()
                c.setFont("Helvetica", 11)
                y = height - margin
        else:
            # Empty line
            y -= line_height
            if y < margin:
                c.showPage()
                c.setFont("Helvetica", 11)
                y = height - margin

    c.save()
    output.seek(0)
    return output.getvalue()


def html_to_pdf(input_buffer):
    """Convert HTML to PDF."""
    html_content = input_buffer.decode('utf-8')

    # Try WeasyPrint first (best quality)
    try:
        from weasyprint import HTML
        output = io.BytesIO()
        HTML(string=html_content).write_pdf(output)
        output.seek(0)
        return output.getvalue()
    except ImportError:
        pass
    except Exception as e:
        print(f"WeasyPrint error: {e}")

    # Fallback: Strip HTML and convert as plain text
    import re
    text = re.sub(r'<[^>]+>', '', html_content)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = text.replace('&lt;', '<').replace('&gt;', '>')
    return text_to_pdf(text.encode('utf-8'))


def html_to_text(input_buffer):
    """Convert HTML to plain text."""
    import re
    html = input_buffer.decode('utf-8')

    # Remove script and style elements
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Replace common HTML entities
    html = html.replace('&nbsp;', ' ')
    html = html.replace('&amp;', '&')
    html = html.replace('&lt;', '<')
    html = html.replace('&gt;', '>')
    html = html.replace('&quot;', '"')

    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html)

    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text.encode('utf-8')


# ============ DATA FORMAT CONVERSIONS ============

def csv_to_json(input_buffer):
    """Convert CSV to JSON using pandas."""
    df = pd.read_csv(io.BytesIO(input_buffer))
    return df.to_json(orient='records', indent=2).encode('utf-8')


def json_to_csv(input_buffer):
    """Convert JSON to CSV using pandas."""
    data = json.loads(input_buffer.decode('utf-8'))

    if isinstance(data, list):
        df = pd.DataFrame(data)
    elif isinstance(data, dict):
        df = pd.DataFrame([data])
    else:
        raise ValueError("JSON must be an array or object")

    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output.getvalue()


def xml_to_json(input_buffer):
    """Convert XML to JSON."""
    xml_content = input_buffer.decode('utf-8')
    data = xmltodict.parse(xml_content)
    return json.dumps(data, indent=2).encode('utf-8')


def json_to_xml(input_buffer):
    """Convert JSON to XML."""
    data = json.loads(input_buffer.decode('utf-8'))

    # Wrap in root element if needed
    if isinstance(data, list):
        data = {'items': {'item': data}}
    elif not isinstance(data, dict):
        data = {'root': data}

    xml = xmltodict.unparse(data, pretty=True)
    return xml.encode('utf-8')


def csv_to_xlsx(input_buffer):
    """Convert CSV to Excel XLSX."""
    df = pd.read_csv(io.BytesIO(input_buffer))
    output = io.BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)
    return output.getvalue()


def xlsx_to_csv(input_buffer):
    """Convert Excel XLSX to CSV."""
    df = pd.read_excel(io.BytesIO(input_buffer), engine='openpyxl')
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output.getvalue()


def xlsx_to_json(input_buffer):
    """Convert Excel XLSX to JSON."""
    df = pd.read_excel(io.BytesIO(input_buffer), engine='openpyxl')
    return df.to_json(orient='records', indent=2).encode('utf-8')


def json_to_yaml(input_buffer):
    """Convert JSON to YAML."""
    data = json.loads(input_buffer.decode('utf-8'))
    return yaml.dump(data, default_flow_style=False, allow_unicode=True).encode('utf-8')


def yaml_to_json(input_buffer):
    """Convert YAML to JSON."""
    data = yaml.safe_load(input_buffer.decode('utf-8'))
    return json.dumps(data, indent=2).encode('utf-8')


# ============ AUDIO CONVERSIONS ============

def convert_audio(input_buffer, input_format, output_format):
    """Convert between audio formats using pydub (requires FFmpeg)."""
    # Create temp input file
    with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as temp_in:
        temp_in.write(input_buffer)
        temp_in_path = temp_in.name

    try:
        # Load audio file
        audio = AudioSegment.from_file(temp_in_path, format=input_format)

        # Export to output format
        output = io.BytesIO()

        # Format-specific options
        export_kwargs = {'format': output_format}
        if output_format == 'mp3':
            export_kwargs['bitrate'] = '192k'
        elif output_format == 'ogg':
            export_kwargs['codec'] = 'libvorbis'
        elif output_format == 'aac':
            export_kwargs['codec'] = 'aac'
        elif output_format == 'm4a':
            export_kwargs['format'] = 'ipod'
            export_kwargs['codec'] = 'aac'

        audio.export(output, **export_kwargs)
        output.seek(0)
        return output.getvalue()
    finally:
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)


def audio_to_video(input_buffer, input_format, output_format='mp4'):
    """Convert audio to video with static image (black screen)."""
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as temp_audio:
        temp_audio.write(input_buffer)
        audio_path = temp_audio.name

    output_path = audio_path.replace(f'.{input_format}', f'.{output_format}')

    try:
        # Load audio and create video with black screen
        audio_clip = AudioFileClip(audio_path)

        # Create a black video clip with the same duration as audio
        from moviepy.editor import ColorClip
        video_clip = ColorClip(size=(1280, 720), color=(0, 0, 0), duration=audio_clip.duration)
        video_clip = video_clip.set_audio(audio_clip)

        # Write video
        video_clip.write_videofile(output_path, fps=24, codec='libx264', audio_codec='aac', verbose=False, logger=None)

        video_clip.close()
        audio_clip.close()

        with open(output_path, 'rb') as f:
            result = f.read()
        return result
    finally:
        if os.path.exists(audio_path):
            os.unlink(audio_path)
        if os.path.exists(output_path):
            os.unlink(output_path)


# ============ VIDEO CONVERSIONS ============

def convert_video(input_buffer, input_format, output_format):
    """Convert between video formats using moviepy (requires FFmpeg)."""
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as temp_in:
        temp_in.write(input_buffer)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path.replace(f'.{input_format}', f'.{output_format}')

    try:
        video = VideoFileClip(temp_in_path)

        # Format-specific options
        if output_format == 'gif':
            # Convert to GIF
            video.write_gif(temp_out_path, fps=10)
        elif output_format == 'webm':
            video.write_videofile(temp_out_path, codec='libvpx', audio_codec='libvorbis', verbose=False, logger=None)
        elif output_format == 'avi':
            video.write_videofile(temp_out_path, codec='png', verbose=False, logger=None)
        elif output_format in ['mp4', 'mov']:
            video.write_videofile(temp_out_path, codec='libx264', audio_codec='aac', verbose=False, logger=None)
        elif output_format == 'mkv':
            video.write_videofile(temp_out_path, codec='libx264', audio_codec='aac', verbose=False, logger=None)
        else:
            video.write_videofile(temp_out_path, verbose=False, logger=None)

        video.close()

        with open(temp_out_path, 'rb') as f:
            result = f.read()
        return result
    finally:
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)
        if os.path.exists(temp_out_path):
            os.unlink(temp_out_path)


def video_to_audio(input_buffer, input_format, output_format='mp3'):
    """Extract audio from video."""
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix=f'.{input_format}', delete=False) as temp_in:
        temp_in.write(input_buffer)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path.replace(f'.{input_format}', f'.{output_format}')

    try:
        video = VideoFileClip(temp_in_path)

        if video.audio is None:
            raise ValueError("Video has no audio track")

        # Extract audio
        video.audio.write_audiofile(temp_out_path, verbose=False, logger=None)
        video.close()

        with open(temp_out_path, 'rb') as f:
            result = f.read()
        return result
    finally:
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)
        if os.path.exists(temp_out_path):
            os.unlink(temp_out_path)


def video_to_gif(input_buffer, input_format):
    """Convert video to animated GIF."""
    return convert_video(input_buffer, input_format, 'gif')


# ============ ARCHIVE CONVERSIONS ============

def extract_archive(input_buffer, input_format):
    """Extract archive to a temporary directory and return file list."""
    # Handle compound extensions for temp file suffix
    suffix = '.tar.gz' if input_format == 'tar.gz' else f'.{input_format}'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_in:
        temp_in.write(input_buffer)
        temp_in_path = temp_in.name

    extract_dir = tempfile.mkdtemp()

    try:
        if input_format == 'zip':
            with zipfile.ZipFile(temp_in_path, 'r') as zf:
                zf.extractall(extract_dir)
        elif input_format == 'tar':
            with tarfile.open(temp_in_path, 'r') as tf:
                tf.extractall(extract_dir)
        elif input_format in ['tar.gz', 'tgz']:
            with tarfile.open(temp_in_path, 'r:gz') as tf:
                tf.extractall(extract_dir)
        elif input_format == '7z':
            with py7zr.SevenZipFile(temp_in_path, 'r') as sz:
                sz.extractall(extract_dir)
        else:
            raise ValueError(f"Unsupported archive format: {input_format}")

        return extract_dir, temp_in_path
    except Exception as e:
        # Cleanup on error
        if os.path.exists(temp_in_path):
            os.unlink(temp_in_path)
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
        raise e


def create_archive(source_dir, output_format):
    """Create archive from directory."""
    import subprocess
    output = io.BytesIO()

    if output_format == 'zip':
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(source_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_name = os.path.relpath(file_path, source_dir)
                    zf.write(file_path, arc_name)
    elif output_format == 'tar':
        # Plain tar (no compression)
        with tempfile.NamedTemporaryFile(suffix='.tar', delete=False) as temp_out:
            temp_out_path = temp_out.name

        try:
            with tarfile.open(temp_out_path, 'w') as tf:
                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_name = os.path.relpath(file_path, source_dir)
                        tf.add(file_path, arc_name)

            with open(temp_out_path, 'rb') as f:
                output.write(f.read())
        finally:
            if os.path.exists(temp_out_path):
                os.unlink(temp_out_path)
    elif output_format in ['tar.gz', 'tgz']:
        # Gzipped tar
        suffix = '.tar.gz' if output_format == 'tar.gz' else '.tgz'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_out:
            temp_out_path = temp_out.name

        try:
            with tarfile.open(temp_out_path, 'w:gz') as tf:
                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_name = os.path.relpath(file_path, source_dir)
                        tf.add(file_path, arc_name)

            with open(temp_out_path, 'rb') as f:
                output.write(f.read())
        finally:
            if os.path.exists(temp_out_path):
                os.unlink(temp_out_path)
    elif output_format == '7z':
        with tempfile.NamedTemporaryFile(suffix='.7z', delete=False) as temp_out:
            temp_out_path = temp_out.name

        try:
            with py7zr.SevenZipFile(temp_out_path, 'w') as sz:
                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_name = os.path.relpath(file_path, source_dir)
                        sz.write(file_path, arc_name)

            with open(temp_out_path, 'rb') as f:
                output.write(f.read())
        finally:
            if os.path.exists(temp_out_path):
                os.unlink(temp_out_path)
    else:
        raise ValueError(f"Unsupported output archive format: {output_format}")

    output.seek(0)
    return output.getvalue()


def convert_archive(input_buffer, input_format, output_format):
    """Convert between archive formats."""
    extract_dir = None
    temp_in_path = None

    try:
        # Extract the input archive
        extract_dir, temp_in_path = extract_archive(input_buffer, input_format)

        # Create new archive in output format
        result = create_archive(extract_dir, output_format)
        return result
    finally:
        # Cleanup
        if temp_in_path and os.path.exists(temp_in_path):
            os.unlink(temp_in_path)
        if extract_dir and os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)


# ============ CONVERSION ROUTER ============

def convert_file(input_buffer, input_format, output_format):
    """Route conversion to appropriate handler."""
    input_format = input_format.lower()
    output_format = output_format.lower()

    # Normalize formats
    if input_format == 'jpeg':
        input_format = 'jpg'
    if output_format == 'jpeg':
        output_format = 'jpg'
    if input_format == 'yml':
        input_format = 'yaml'
    if output_format == 'yml':
        output_format = 'yaml'

    # Image conversions
    if input_format in IMAGE_FORMATS:
        if output_format in IMAGE_FORMATS:
            return convert_image(input_buffer, input_format, output_format), get_mime_type(output_format)
        elif output_format == 'pdf':
            return image_to_pdf(input_buffer), 'application/pdf'

    # PDF conversions
    if input_format == 'pdf':
        if output_format == 'docx':
            return pdf_to_docx(input_buffer), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif output_format == 'txt':
            return pdf_to_text(input_buffer), 'text/plain'
        elif output_format in ['png', 'jpg']:
            return pdf_to_image(input_buffer, output_format), get_mime_type(output_format)

    # DOCX conversions
    if input_format == 'docx':
        if output_format == 'pdf':
            return docx_to_pdf(input_buffer), 'application/pdf'
        elif output_format == 'txt':
            return docx_to_text(input_buffer), 'text/plain'
        elif output_format == 'html':
            return docx_to_html(input_buffer), 'text/html'

    # Markdown conversions
    if input_format in ['md', 'markdown']:
        if output_format == 'html':
            return markdown_to_html(input_buffer), 'text/html'
        elif output_format == 'pdf':
            html = markdown_to_html(input_buffer)
            return html_to_pdf(html), 'application/pdf'
        elif output_format == 'txt':
            return input_buffer, 'text/plain'

    # HTML conversions
    if input_format in ['html', 'htm']:
        if output_format == 'pdf':
            return html_to_pdf(input_buffer), 'application/pdf'
        elif output_format == 'txt':
            return html_to_text(input_buffer), 'text/plain'

    # Text conversions
    if input_format == 'txt':
        if output_format == 'pdf':
            return text_to_pdf(input_buffer), 'application/pdf'
        elif output_format == 'html':
            text = input_buffer.decode('utf-8')
            html = f"<html><body><pre>{text}</pre></body></html>"
            return html.encode('utf-8'), 'text/html'

    # CSV conversions
    if input_format == 'csv':
        if output_format == 'json':
            return csv_to_json(input_buffer), 'application/json'
        elif output_format == 'xlsx':
            return csv_to_xlsx(input_buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif output_format == 'txt':
            return input_buffer, 'text/plain'

    # JSON conversions
    if input_format == 'json':
        if output_format == 'csv':
            return json_to_csv(input_buffer), 'text/csv'
        elif output_format == 'xml':
            return json_to_xml(input_buffer), 'application/xml'
        elif output_format == 'yaml':
            return json_to_yaml(input_buffer), 'text/yaml'
        elif output_format == 'txt':
            # Pretty print JSON
            data = json.loads(input_buffer.decode('utf-8'))
            return json.dumps(data, indent=2).encode('utf-8'), 'text/plain'

    # XML conversions
    if input_format == 'xml':
        if output_format == 'json':
            return xml_to_json(input_buffer), 'application/json'
        elif output_format == 'txt':
            return input_buffer, 'text/plain'

    # YAML conversions
    if input_format == 'yaml':
        if output_format == 'json':
            return yaml_to_json(input_buffer), 'application/json'
        elif output_format == 'txt':
            return input_buffer, 'text/plain'

    # XLSX conversions
    if input_format in ['xlsx', 'xls']:
        if output_format == 'csv':
            return xlsx_to_csv(input_buffer), 'text/csv'
        elif output_format == 'json':
            return xlsx_to_json(input_buffer), 'application/json'

    # Audio conversions
    if input_format in AUDIO_FORMATS:
        if output_format in AUDIO_FORMATS:
            return convert_audio(input_buffer, input_format, output_format), get_mime_type(output_format)
        elif output_format in VIDEO_FORMATS:
            return audio_to_video(input_buffer, input_format, output_format), get_mime_type(output_format)

    # Video conversions
    if input_format in VIDEO_FORMATS:
        if output_format in VIDEO_FORMATS:
            return convert_video(input_buffer, input_format, output_format), get_mime_type(output_format)
        elif output_format in AUDIO_FORMATS:
            return video_to_audio(input_buffer, input_format, output_format), get_mime_type(output_format)
        elif output_format == 'gif':
            return video_to_gif(input_buffer, input_format), 'image/gif'

    # Archive conversions
    if input_format in ARCHIVE_FORMATS:
        if output_format in ARCHIVE_FORMATS:
            return convert_archive(input_buffer, input_format, output_format), get_mime_type(output_format)

    raise ValueError(f"Unsupported conversion: {input_format} to {output_format}")


def get_mime_type(format):
    """Get MIME type for format."""
    mime_types = {
        # Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'tiff': 'image/tiff',
        'ico': 'image/x-icon',
        # Documents
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain',
        'html': 'text/html',
        'htm': 'text/html',
        'md': 'text/markdown',
        # Data formats
        'csv': 'text/csv',
        'json': 'application/json',
        'xml': 'application/xml',
        'yaml': 'text/yaml',
        'yml': 'text/yaml',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        # Audio formats
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'm4a': 'audio/mp4',
        'wma': 'audio/x-ms-wma',
        # Video formats
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'mkv': 'video/x-matroska',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        # Archive formats
        'zip': 'application/zip',
        'tar': 'application/x-tar',
        'tar.gz': 'application/gzip',
        'tgz': 'application/gzip',
        '7z': 'application/x-7z-compressed',
    }
    return mime_types.get(format.lower(), 'application/octet-stream')


# ============ API ROUTES ============

@app.route('/')
def index():
    """Serve the main page."""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    """Serve static files."""
    return send_from_directory('.', path)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'message': 'WildConverter Python server is running'
    })


@app.route('/api/convert', methods=['POST'])
def convert():
    """Main conversion endpoint."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        target_format = request.form.get('targetFormat')

        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400

        if not target_format:
            return jsonify({'error': 'Target format not specified'}), 400

        # Read file
        input_buffer = file.read()
        input_format = get_file_extension(file.filename)

        # Detect format if not clear from extension
        if not input_format:
            input_format = detect_file_type(input_buffer, file.filename)

        print(f"Converting {input_format} to {target_format}...")

        # Perform conversion
        output_buffer, mime_type = convert_file(input_buffer, input_format, target_format)

        # Generate output filename
        filename_base = Path(file.filename).stem
        output_filename = f"{filename_base}.{target_format}"

        return send_file(
            io.BytesIO(output_buffer),
            mimetype=mime_type,
            as_attachment=True,
            download_name=output_filename
        )

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Conversion error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("""
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   WildConverter Python Server is running!                      ║
║                                                                ║
║   Local:   http://localhost:3000                               ║
║                                                                ║
║   Supported conversions:                                       ║
║   • Images: JPG, PNG, WebP, GIF, BMP, TIFF ↔ Any              ║
║   • Images → PDF                                               ║
║   • PDF → DOCX (editable), TXT, PNG, JPG                      ║
║   • DOCX → PDF, TXT, HTML                                      ║
║   • Markdown → HTML, PDF                                       ║
║   • HTML → PDF, TXT                                            ║
║   • CSV ↔ JSON ↔ XLSX                                         ║
║   • XML ↔ JSON, YAML ↔ JSON                                   ║
║   • Audio: MP3, WAV, OGG, FLAC, AAC, M4A ↔ Any               ║
║   • Video: MP4, WebM, AVI, MOV, MKV ↔ Any                     ║
║   • Video → Audio (extract), Video → GIF                      ║
║   • Archives: ZIP, TAR, TAR.GZ, 7Z ↔ Any                     ║
║                                                                ║
║   Note: Audio/Video require FFmpeg installed on system        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    """)
    app.run(host='0.0.0.0', port=3000, debug=True)
