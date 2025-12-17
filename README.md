# WildConverter

A comprehensive file conversion tool powered by Python. Convert between images, PDFs, documents, audio, video, archives, and data formats with high fidelity.

## Features

- **Image Conversions**: JPG, PNG, WebP, GIF, BMP, TIFF
- **PDF Conversions**: PDF to DOCX (editable text), PDF to TXT, PDF to images
- **Document Conversions**: DOCX to PDF, DOCX to TXT, DOCX to HTML
- **Text/Markup**: Markdown to HTML/PDF, HTML to PDF/TXT, TXT to PDF
- **Data Formats**: CSV ↔ JSON, XML ↔ JSON, YAML ↔ JSON, XLSX ↔ CSV/JSON
- **Audio Conversions**: MP3, WAV, OGG, FLAC, AAC, M4A (requires FFmpeg)
- **Video Conversions**: MP4, WebM, AVI, MOV, MKV, GIF (requires FFmpeg)
- **Archive Conversions**: ZIP, TAR, TGZ, 7Z, RAR

## Prerequisites

- **Python 3.8+** - Download from https://www.python.org/downloads/
- **LibreOffice** - Required for DOCX to PDF conversion
- **FFmpeg** - Required for audio and video conversions

### Installing FFmpeg

**Windows:**
- Download from https://ffmpeg.org/download.html or use chocolatey:
```bash
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

### Installing LibreOffice

**Windows:**
- Download from https://www.libreoffice.org/download/download/
- Run the installer

**macOS:**
```bash
brew install --cask libreoffice
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libreoffice
```

## Installation

1. Clone or download this project

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. (Optional) For PDF to image conversion, install PyMuPDF:
   ```bash
   pip install PyMuPDF
   ```

5. (Optional) For better HTML to PDF conversion, install WeasyPrint:
   ```bash
   pip install weasyprint
   ```

   On Windows, WeasyPrint requires GTK3. See: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html

## Starting the Server

```bash
python app.py
```

The server will start at `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Drag and drop a file or click "Browse Files"
3. Select the target format from the dropdown
4. Click "Convert"
5. Download the converted file

## Supported Conversions

### Images (Pillow)
| Source | Target |
|--------|--------|
| JPG, PNG, WebP, GIF, BMP, TIFF | JPG, PNG, WebP, GIF, BMP, TIFF |
| Any image | PDF |

### PDF
| Source | Target | Library |
|--------|--------|---------|
| PDF | DOCX | pdf2docx |
| PDF | TXT | pdfplumber |
| PDF | PNG, JPG | PyMuPDF |

### Documents
| Source | Target | Library |
|--------|--------|---------|
| DOCX | PDF | LibreOffice |
| DOCX | TXT | mammoth |
| DOCX | HTML | mammoth |

### Text/Markup
| Source | Target | Library |
|--------|--------|---------|
| Markdown | HTML | markdown |
| Markdown | PDF | markdown + WeasyPrint |
| HTML | PDF | WeasyPrint |
| HTML | TXT | Built-in |
| TXT | PDF | ReportLab |

### Data Formats
| Source | Target | Library |
|--------|--------|---------|
| CSV | JSON, XLSX | pandas |
| JSON | CSV, XML, YAML | pandas, xmltodict, PyYAML |
| XML | JSON | xmltodict |
| YAML | JSON | PyYAML |
| XLSX | CSV, JSON | pandas + openpyxl |

### Audio (requires FFmpeg)
| Source | Target | Library |
|--------|--------|---------|
| MP3, WAV, OGG, FLAC, AAC, M4A | MP3, WAV, OGG, FLAC, AAC, M4A | pydub |

### Video (requires FFmpeg)
| Source | Target | Library |
|--------|--------|---------|
| MP4, WebM, AVI, MOV, MKV | MP4, WebM, AVI, MOV, MKV | moviepy |
| Any video | GIF | moviepy |
| Any video | MP3, WAV (audio extract) | moviepy |

### Archives
| Source | Target | Library |
|--------|--------|---------|
| ZIP | TAR, TGZ, 7Z | zipfile, tarfile, py7zr |
| TAR, TGZ | ZIP, 7Z | tarfile, zipfile, py7zr |
| 7Z | ZIP, TAR, TGZ | py7zr, zipfile, tarfile |
| RAR | ZIP, TAR, TGZ, 7Z | rarfile + others |

## Python Libraries Used

- **Flask** - Web framework
- **Pillow** - Image processing
- **pdf2docx** - PDF to DOCX conversion
- **pdfplumber** - PDF text extraction
- **PyPDF2** - PDF manipulation
- **ReportLab** - PDF generation
- **python-docx** - DOCX creation
- **mammoth** - DOCX to HTML/TXT
- **LibreOffice** - DOCX to PDF conversion (external)
- **pandas** - Data manipulation
- **openpyxl** - Excel file handling
- **markdown** - Markdown processing
- **WeasyPrint** - HTML to PDF (optional)
- **xmltodict** - XML parsing
- **PyYAML** - YAML parsing
- **pydub** - Audio processing (requires FFmpeg)
- **moviepy** - Video processing (requires FFmpeg)
- **py7zr** - 7Z archive handling
- **rarfile** - RAR archive reading

## Troubleshooting

### DOCX to PDF not working
Make sure LibreOffice is installed:
```bash
# Windows - download from https://www.libreoffice.org/download/download/
# Verify installation:
soffice --version
```

### PDF to DOCX not working
Make sure pdf2docx is installed:
```bash
pip install pdf2docx
```

### PDF to Image not working
Install PyMuPDF:
```bash
pip install PyMuPDF
```

### HTML to PDF shows plain text
Install WeasyPrint for proper HTML rendering:
```bash
pip install weasyprint
```

### DOCX to PDF quality issues
On Windows, install docx2pdf and Microsoft Word for best results:
```bash
pip install docx2pdf
```

### Port already in use
Edit `app.py` and change the port number at the bottom:
```python
app.run(host='0.0.0.0', port=8080, debug=True)
```

### Import errors
Make sure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Audio/Video conversion not working
Make sure FFmpeg is installed and available in your PATH:
```bash
# Verify FFmpeg installation:
ffmpeg -version

# Windows (using Chocolatey):
choco install ffmpeg

# macOS:
brew install ffmpeg

# Linux:
sudo apt install ffmpeg
```

### RAR extraction not working
RAR extraction requires the `unrar` tool:
```bash
# Windows: Download UnRAR from https://www.rarlab.com/rar_add.htm
# macOS:
brew install unrar
# Linux:
sudo apt install unrar
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Convert File
```
POST /api/convert
Content-Type: multipart/form-data

file: <file>
targetFormat: <format>
```

## Project Structure

```
wildConverter/
├── app.py              # Python Flask server
├── app.js              # Frontend JavaScript
├── index.html          # Main HTML page
├── styles.css          # CSS styles
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## License

MIT
