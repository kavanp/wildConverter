const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Image processing
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

// PDF processing
const pdfParse = require('pdf-parse');

// Document processing
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');

// Text/Markup processing
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

// Data format processing
const Papa = require('papaparse');
const xml2js = require('xml2js');

// Puppeteer for HTML to PDF
let puppeteer;
let browser = null;

async function getBrowser() {
    if (!puppeteer) {
        puppeteer = require('puppeteer');
    }
    if (!browser) {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'WildConverter server is running' });
});

// Main conversion endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { targetFormat } = req.body;
        if (!targetFormat) {
            return res.status(400).json({ error: 'Target format not specified' });
        }

        const sourceExt = path.extname(req.file.originalname).toLowerCase().slice(1);
        const fileBuffer = req.file.buffer;
        const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));

        console.log(`Converting ${sourceExt} to ${targetFormat}...`);

        let result;
        let outputMimeType;
        let outputFileName;

        // ============ IMAGE CONVERSIONS (sharp) ============
        const imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'ico', 'svg', 'tiff', 'avif'];
        if (imageFormats.includes(sourceExt)) {
            if (imageFormats.includes(targetFormat) && targetFormat !== 'svg') {
                // Image to Image conversion using sharp
                result = await convertImageToImage(fileBuffer, targetFormat);
                outputMimeType = getImageMimeType(targetFormat);
                outputFileName = `${fileName}.${targetFormat}`;
            } else if (targetFormat === 'pdf') {
                // Image to PDF using PDFKit
                result = await convertImageToPdf(fileBuffer);
                outputMimeType = 'application/pdf';
                outputFileName = `${fileName}.pdf`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: ${sourceExt} to ${targetFormat}` });
            }
        }
        // ============ PDF CONVERSIONS ============
        else if (sourceExt === 'pdf') {
            if (targetFormat === 'txt') {
                // PDF to TXT using pdf-parse
                result = await convertPdfToTxt(fileBuffer);
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else if (targetFormat === 'docx') {
                // PDF to DOCX using Python pdf2docx
                result = await convertPdfToDocx(fileBuffer, fileName);
                outputMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                outputFileName = `${fileName}.docx`;
            } else if (targetFormat === 'png' || targetFormat === 'jpg' || targetFormat === 'jpeg') {
                // PDF to Image using Puppeteer
                result = await convertPdfToImage(fileBuffer, targetFormat);
                outputMimeType = getImageMimeType(targetFormat);
                outputFileName = `${fileName}.${targetFormat}`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: PDF to ${targetFormat}` });
            }
        }
        // ============ DOCX CONVERSIONS ============
        else if (sourceExt === 'docx') {
            if (targetFormat === 'pdf') {
                // DOCX to PDF using LibreOffice
                result = await convertDocxToPdf(fileBuffer);
                outputMimeType = 'application/pdf';
                outputFileName = `${fileName}.pdf`;
            } else if (targetFormat === 'txt') {
                // DOCX to TXT using mammoth
                result = await convertDocxToTxt(fileBuffer);
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else if (targetFormat === 'html') {
                // DOCX to HTML using mammoth
                result = await convertDocxToHtml(fileBuffer);
                outputMimeType = 'text/html';
                outputFileName = `${fileName}.html`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: DOCX to ${targetFormat}` });
            }
        }
        // ============ TEXT/MARKUP CONVERSIONS (markdown-it + puppeteer) ============
        else if (['txt', 'md', 'markdown'].includes(sourceExt)) {
            if (targetFormat === 'html') {
                result = await convertMarkdownToHtml(fileBuffer);
                outputMimeType = 'text/html';
                outputFileName = `${fileName}.html`;
            } else if (targetFormat === 'pdf') {
                result = await convertTextToPdf(fileBuffer, sourceExt);
                outputMimeType = 'application/pdf';
                outputFileName = `${fileName}.pdf`;
            } else if (targetFormat === 'txt') {
                result = fileBuffer; // Already text
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: ${sourceExt} to ${targetFormat}` });
            }
        }
        else if (sourceExt === 'html' || sourceExt === 'htm') {
            if (targetFormat === 'pdf') {
                result = await convertHtmlToPdf(fileBuffer);
                outputMimeType = 'application/pdf';
                outputFileName = `${fileName}.pdf`;
            } else if (targetFormat === 'txt') {
                result = await convertHtmlToTxt(fileBuffer);
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: HTML to ${targetFormat}` });
            }
        }
        // ============ CSV/JSON CONVERSIONS (papaparse) ============
        else if (sourceExt === 'csv') {
            if (targetFormat === 'json') {
                result = await convertCsvToJson(fileBuffer);
                outputMimeType = 'application/json';
                outputFileName = `${fileName}.json`;
            } else if (targetFormat === 'txt') {
                result = fileBuffer;
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: CSV to ${targetFormat}` });
            }
        }
        else if (sourceExt === 'json') {
            if (targetFormat === 'csv') {
                result = await convertJsonToCsv(fileBuffer);
                outputMimeType = 'text/csv';
                outputFileName = `${fileName}.csv`;
            } else if (targetFormat === 'txt') {
                result = Buffer.from(JSON.stringify(JSON.parse(fileBuffer.toString()), null, 2));
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: JSON to ${targetFormat}` });
            }
        }
        // ============ XML CONVERSIONS (xml2js) ============
        else if (sourceExt === 'xml') {
            if (targetFormat === 'json') {
                result = await convertXmlToJson(fileBuffer);
                outputMimeType = 'application/json';
                outputFileName = `${fileName}.json`;
            } else if (targetFormat === 'txt') {
                result = fileBuffer;
                outputMimeType = 'text/plain';
                outputFileName = `${fileName}.txt`;
            } else {
                return res.status(400).json({ error: `Unsupported conversion: XML to ${targetFormat}` });
            }
        }
        else {
            return res.status(400).json({ error: `Unsupported source format: ${sourceExt}` });
        }

        // Send the converted file
        res.setHeader('Content-Type', outputMimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
        res.send(Buffer.from(result));

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: error.message || 'Conversion failed' });
    }
});

// ============ IMAGE CONVERSION FUNCTIONS (sharp) ============

async function convertImageToImage(inputBuffer, targetFormat) {
    let sharpInstance = sharp(inputBuffer);

    // Handle format-specific options
    switch (targetFormat) {
        case 'jpg':
        case 'jpeg':
            return await sharpInstance.jpeg({ quality: 90 }).toBuffer();
        case 'png':
            return await sharpInstance.png().toBuffer();
        case 'webp':
            return await sharpInstance.webp({ quality: 90 }).toBuffer();
        case 'gif':
            return await sharpInstance.gif().toBuffer();
        case 'tiff':
            return await sharpInstance.tiff().toBuffer();
        case 'avif':
            return await sharpInstance.avif({ quality: 80 }).toBuffer();
        case 'bmp':
            // Sharp doesn't support BMP output, convert to PNG
            return await sharpInstance.png().toBuffer();
        default:
            return await sharpInstance.toBuffer();
    }
}

async function convertImageToPdf(imageBuffer) {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();

    return new Promise((resolve, reject) => {
        const chunks = [];
        const doc = new PDFDocument({
            size: [metadata.width, metadata.height],
            margin: 0
        });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.image(imageBuffer, 0, 0, {
            width: metadata.width,
            height: metadata.height
        });

        doc.end();
    });
}

function getImageMimeType(format) {
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'tiff': 'image/tiff',
        'avif': 'image/avif',
        'ico': 'image/x-icon',
        'svg': 'image/svg+xml'
    };
    return mimeTypes[format] || 'application/octet-stream';
}

// ============ PDF CONVERSION FUNCTIONS ============

async function convertPdfToTxt(pdfBuffer) {
    const data = await pdfParse(pdfBuffer);
    return Buffer.from(data.text, 'utf-8');
}

async function convertPdfToDocx(pdfBuffer, fileName) {
    // Use Python pdf2docx for high-quality conversion
    const inputPath = path.join(tempDir, `${fileName}_${Date.now()}.pdf`);
    const outputPath = path.join(tempDir, `${fileName}_${Date.now()}.docx`);

    try {
        // Write PDF to temp file
        fs.writeFileSync(inputPath, pdfBuffer);

        // Run Python script
        const pythonScript = path.join(__dirname, 'pdf2docx_converter.py');

        // Check if Python script exists, if not, try using pdf2docx directly
        try {
            execSync(`python "${pythonScript}" "${inputPath}" "${outputPath}"`, {
                timeout: 120000, // 2 minute timeout
                stdio: 'pipe'
            });
        } catch (pythonError) {
            // Try with python3
            try {
                execSync(`python3 "${pythonScript}" "${inputPath}" "${outputPath}"`, {
                    timeout: 120000,
                    stdio: 'pipe'
                });
            } catch (python3Error) {
                throw new Error('PDF to DOCX conversion requires Python with pdf2docx installed. Run: pip install pdf2docx');
            }
        }

        // Read the output file
        const result = fs.readFileSync(outputPath);

        return result;
    } finally {
        // Cleanup temp files
        try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }
}

async function convertPdfToImage(pdfBuffer, format) {
    // Use Puppeteer to render PDF page as image
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        const pdfBase64 = pdfBuffer.toString('base64');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            <style>
                body { margin: 0; padding: 0; background: white; }
                canvas { display: block; }
            </style>
        </head>
        <body>
            <canvas id="canvas"></canvas>
            <script>
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                async function renderPage() {
                    const pdfData = atob('${pdfBase64}');
                    const pdfArray = new Uint8Array(pdfData.length);
                    for (let i = 0; i < pdfData.length; i++) {
                        pdfArray[i] = pdfData.charCodeAt(i);
                    }

                    const pdf = await pdfjsLib.getDocument({ data: pdfArray }).promise;
                    const pdfPage = await pdf.getPage(1);

                    const scale = 2;
                    const viewport = pdfPage.getViewport({ scale });

                    const canvas = document.getElementById('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

                    window.pageRendered = true;
                    window.pageWidth = viewport.width;
                    window.pageHeight = viewport.height;
                }

                renderPage().catch(err => {
                    window.renderError = err.message;
                    window.pageRendered = true;
                });
            </script>
        </body>
        </html>`;

        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.waitForFunction('window.pageRendered === true', { timeout: 30000 });

        // Check for errors
        const renderError = await page.evaluate(() => window.renderError);
        if (renderError) {
            throw new Error(`PDF rendering failed: ${renderError}`);
        }

        const dimensions = await page.evaluate(() => ({
            width: window.pageWidth,
            height: window.pageHeight
        }));

        await page.setViewport({
            width: Math.ceil(dimensions.width),
            height: Math.ceil(dimensions.height)
        });

        const screenshot = await page.screenshot({
            type: format === 'png' ? 'png' : 'jpeg',
            quality: format === 'png' ? undefined : 90,
            fullPage: true
        });

        return screenshot;
    } finally {
        await page.close();
    }
}

// ============ DOCX CONVERSION FUNCTIONS ============

async function convertDocxToPdf(docxBuffer) {
    return new Promise((resolve, reject) => {
        libre.convert(docxBuffer, '.pdf', undefined, (err, result) => {
            if (err) {
                reject(new Error(`DOCX to PDF conversion failed: ${err.message}. Make sure LibreOffice is installed.`));
            } else {
                resolve(result);
            }
        });
    });
}

async function convertDocxToTxt(docxBuffer) {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return Buffer.from(result.value, 'utf-8');
}

async function convertDocxToHtml(docxBuffer) {
    const result = await mammoth.convertToHtml({
        buffer: docxBuffer
    }, {
        convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
                return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                };
            });
        })
    });

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; margin: 1em 0; width: 100%; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
${result.value}
</body>
</html>`;
    return Buffer.from(html, 'utf-8');
}

// ============ TEXT/MARKUP CONVERSION FUNCTIONS ============

async function convertMarkdownToHtml(buffer) {
    const markdown = buffer.toString('utf-8');
    const htmlContent = md.render(markdown);

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
        code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
        blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
        img { max-width: 100%; }
        table { border-collapse: collapse; margin: 1em 0; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    return Buffer.from(html, 'utf-8');
}

async function convertTextToPdf(buffer, sourceFormat) {
    const text = buffer.toString('utf-8');
    let htmlContent;

    if (sourceFormat === 'md' || sourceFormat === 'markdown') {
        htmlContent = md.render(text);
    } else {
        // Plain text - wrap in pre tag
        htmlContent = `<pre style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(text)}</pre>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 1in; }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.5;
        }
        pre { font-size: 10pt; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    return await htmlToPdfWithPuppeteer(html);
}

async function convertHtmlToPdf(buffer) {
    const html = buffer.toString('utf-8');
    return await htmlToPdfWithPuppeteer(html);
}

async function convertHtmlToTxt(buffer) {
    const html = buffer.toString('utf-8');
    // Simple HTML to text conversion
    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    return Buffer.from(text, 'utf-8');
}

async function htmlToPdfWithPuppeteer(html) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in'
            },
            printBackground: true
        });

        return pdfBuffer;
    } finally {
        await page.close();
    }
}

// ============ DATA FORMAT CONVERSION FUNCTIONS ============

async function convertCsvToJson(buffer) {
    const csvText = buffer.toString('utf-8');
    const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    });
    return Buffer.from(JSON.stringify(result.data, null, 2), 'utf-8');
}

async function convertJsonToCsv(buffer) {
    const jsonText = buffer.toString('utf-8');
    const data = JSON.parse(jsonText);

    if (!Array.isArray(data)) {
        throw new Error('JSON must be an array of objects to convert to CSV');
    }

    const csv = Papa.unparse(data);
    return Buffer.from(csv, 'utf-8');
}

async function convertXmlToJson(buffer) {
    const xmlText = buffer.toString('utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    return new Promise((resolve, reject) => {
        parser.parseString(xmlText, (err, result) => {
            if (err) {
                reject(new Error(`XML parsing failed: ${err.message}`));
            } else {
                resolve(Buffer.from(JSON.stringify(result, null, 2), 'utf-8'));
            }
        });
    });
}

// ============ UTILITY FUNCTIONS ============

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Cleanup on exit
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});

process.on('SIGTERM', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   WildConverter Server is running!                             ║
║                                                                ║
║   Local:   http://localhost:${PORT}                              ║
║                                                                ║
║   Supported conversions:                                       ║
║   • Images (sharp): JPG, PNG, WebP, GIF, TIFF, AVIF ↔ Any     ║
║   • Images → PDF (PDFKit)                                      ║
║   • PDF → TXT (pdf-parse)                                      ║
║   • PDF → DOCX (Python pdf2docx) *requires Python              ║
║   • PDF → PNG/JPG (Puppeteer)                                  ║
║   • DOCX → PDF (LibreOffice) *requires LibreOffice             ║
║   • DOCX → TXT/HTML (mammoth)                                  ║
║   • Markdown/TXT → HTML/PDF (markdown-it + Puppeteer)          ║
║   • HTML → PDF/TXT (Puppeteer)                                 ║
║   • CSV ↔ JSON (papaparse)                                     ║
║   • XML → JSON (xml2js)                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
