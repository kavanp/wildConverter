# WildConverter

A comprehensive file conversion tool that supports converting between various file formats including images, PDFs, documents, and data formats.

## Features

- **Image Conversions**: JPG, PNG, WebP, GIF, TIFF, AVIF, BMP, ICO, SVG
- **PDF Conversions**: PDF to DOCX (editable), PDF to TXT, PDF to images
- **Document Conversions**: DOCX to PDF, DOCX to TXT, DOCX to HTML
- **Text/Markup**: Markdown to HTML/PDF, HTML to PDF/TXT
- **Data Formats**: CSV ↔ JSON, XML to JSON

## Prerequisites

### Required

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/

### Optional (for specific conversions)

2. **Python 3** with pdf2docx (for PDF → DOCX)
   ```bash
   pip install pdf2docx
   ```

3. **LibreOffice** (for DOCX → PDF)
   - **Windows**: Download from https://www.libreoffice.org/download/download/
   - **macOS**: `brew install --cask libreoffice`
   - **Linux**: `sudo apt install libreoffice`

4. **FFmpeg** (for audio/video conversions - future feature)
   - **Windows**: Download from https://ffmpeg.org/download.html
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`

## Installation

1. Clone or download this project

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. (Optional) Install Python pdf2docx for PDF to DOCX conversion:
   ```bash
   pip install pdf2docx
   ```

## Starting the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start at `http://localhost:3000`

## Supported Conversions

### Images (using sharp)
| Source | Target |
|--------|--------|
| JPG, PNG, WebP, GIF, BMP, TIFF, AVIF, ICO, SVG | JPG, PNG, WebP, GIF, TIFF, AVIF |
| Any image | PDF |

### PDF
| Source | Target | Tool |
|--------|--------|------|
| PDF | DOCX | Python pdf2docx |
| PDF | TXT | pdf-parse |
| PDF | PNG, JPG | Puppeteer |

### Documents
| Source | Target | Tool |
|--------|--------|------|
| DOCX | PDF | LibreOffice |
| DOCX | TXT | mammoth |
| DOCX | HTML | mammoth |

### Text/Markup
| Source | Target | Tool |
|--------|--------|------|
| Markdown | HTML | markdown-it |
| Markdown, TXT | PDF | markdown-it + Puppeteer |
| HTML | PDF | Puppeteer |
| HTML | TXT | Built-in |

### Data Formats
| Source | Target | Tool |
|--------|--------|------|
| CSV | JSON | papaparse |
| JSON | CSV | papaparse |
| XML | JSON | xml2js |

## Libraries Used

### Server-side
- **sharp** - High-performance image processing
- **PDFKit** - PDF generation
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX parsing
- **libreoffice-convert** - Document conversion via LibreOffice
- **markdown-it** - Markdown parsing
- **Puppeteer** - Browser automation for rendering
- **papaparse** - CSV parsing
- **xml2js** - XML parsing

### Client-side
- **PDF.js** - PDF rendering
- **jsPDF** - PDF generation
- **JSZip** - ZIP handling
- **html2canvas** - HTML to canvas
- **FileSaver.js** - File downloads

## Troubleshooting

### PDF to DOCX not working
Make sure Python and pdf2docx are installed:
```bash
python --version
pip install pdf2docx
```

### DOCX to PDF not working
Make sure LibreOffice is installed and accessible from command line:
```bash
soffice --version
```

### Port already in use
```bash
# Windows
set PORT=8080 && npm start

# macOS/Linux
PORT=8080 npm start
```

### Puppeteer issues on Linux
You may need to install additional dependencies:
```bash
sudo apt-get install -y libgbm-dev libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2
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

## License

MIT
