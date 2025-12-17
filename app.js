// WildConverter - File Conversion App
// Uses server-side processing for complex conversions (PDF, DOCX)
// Falls back to client-side for simple conversions (images, text)

// Server API configuration
const API_BASE = '/api';
let serverAvailable = false;

// Check if server is available on load
async function checkServerAvailability() {
    try {
        const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
        if (response.ok) {
            serverAvailable = true;
            console.log('Server-side processing enabled');
        }
    } catch (e) {
        serverAvailable = false;
        console.log('Server unavailable, using client-side processing only');
    }
}
checkServerAvailability();

// Convert file using server API
async function convertViaServer(file, targetFormat) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    const response = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Server conversion failed');
    }

    return await response.blob();
}

// Conversion format mappings
const conversionMap = {
    // Images
    'image/jpeg': ['png', 'webp', 'gif', 'bmp', 'ico', 'pdf'],
    'image/jpg': ['png', 'webp', 'gif', 'bmp', 'ico', 'pdf'],
    'image/png': ['jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico', 'pdf'],
    'image/webp': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'pdf'],
    'image/gif': ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'ico', 'pdf'],
    'image/bmp': ['jpg', 'jpeg', 'png', 'webp', 'gif', 'ico', 'pdf'],
    'image/svg+xml': ['png', 'jpg', 'jpeg', 'webp', 'pdf'],
    'image/x-icon': ['png', 'jpg', 'jpeg', 'webp', 'gif'],
    'image/vnd.microsoft.icon': ['png', 'jpg', 'jpeg', 'webp', 'gif'],

    // Documents
    'text/plain': ['html', 'md', 'pdf', 'json'],
    'text/html': ['txt', 'md', 'pdf'],
    'text/markdown': ['html', 'txt', 'pdf'],
    'text/csv': ['json', 'txt', 'html'],
    'application/json': ['txt', 'csv', 'yaml'],
    'application/xml': ['json', 'txt'],
    'text/xml': ['json', 'txt'],

    // Word Documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['html', 'txt', 'md', 'pdf'],
    'application/msword': ['html', 'txt', 'md', 'pdf'],

    // Audio
    'audio/mpeg': ['wav', 'ogg', 'webm'],
    'audio/mp3': ['wav', 'ogg', 'webm'],
    'audio/wav': ['mp3', 'ogg', 'webm'],
    'audio/ogg': ['mp3', 'wav', 'webm'],
    'audio/webm': ['mp3', 'wav', 'ogg'],
    'audio/flac': ['mp3', 'wav', 'ogg'],
    'audio/aac': ['mp3', 'wav', 'ogg'],
    'audio/m4a': ['mp3', 'wav', 'ogg'],

    // Video
    'video/mp4': ['webm', 'gif', 'avi'],
    'video/webm': ['mp4', 'gif'],
    'video/quicktime': ['mp4', 'webm', 'gif'],
    'video/x-msvideo': ['mp4', 'webm', 'gif'],
    'video/avi': ['mp4', 'webm', 'gif'],

    // Archives
    'application/zip': ['tar'],
    'application/x-tar': ['zip'],
    'application/gzip': ['zip'],

    // Office-like (limited support)
    'application/pdf': ['txt', 'png', 'jpg', 'docx'],
};

// Format icons mapping
const formatIcons = {
    // Images
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'webp': '🖼️',
    'gif': '🎞️',
    'bmp': '🖼️',
    'ico': '🔷',
    'svg': '📐',
    // Documents
    'pdf': '📄',
    'txt': '📝',
    'html': '🌐',
    'htm': '🌐',
    'md': '📑',
    'csv': '📊',
    'json': '{ }',
    'xml': '📋',
    'yaml': '📋',
    'doc': '📘',
    'docx': '📘',
    // Audio
    'mp3': '🎵',
    'wav': '🎵',
    'ogg': '🎵',
    'webm': '🎵',
    'flac': '🎵',
    'aac': '🎵',
    'm4a': '🎵',
    // Video
    'mp4': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    // Archives
    'zip': '📦',
    'tar': '📦',
    'gz': '📦',
};

// Extension to MIME type mapping
const extToMime = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain',
    'html': 'text/html',
    'htm': 'text/html',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'm4a': 'audio/m4a',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// State
let currentFile = null;
let convertedBlob = null;
let convertedFileName = '';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadSection = document.getElementById('uploadSection');
const convertSection = document.getElementById('convertSection');
const downloadSection = document.getElementById('downloadSection');
const errorSection = document.getElementById('errorSection');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const outputFormat = document.getElementById('outputFormat');
const convertBtn = document.getElementById('convertBtn');
const removeBtn = document.getElementById('removeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const convertAnotherBtn = document.getElementById('convertAnotherBtn');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const errorText = document.getElementById('errorText');

// Event Listeners
dropzone.addEventListener('click', () => fileInput.click());
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

removeBtn.addEventListener('click', resetToUpload);
convertBtn.addEventListener('click', convertFile);
downloadBtn.addEventListener('click', downloadFile);
convertAnotherBtn.addEventListener('click', resetToUpload);
tryAgainBtn.addEventListener('click', resetToUpload);

outputFormat.addEventListener('change', () => {
    convertBtn.disabled = !outputFormat.value;
});

// Functions
function handleFile(file) {
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    // Get available conversions
    let mimeType = file.type;

    // Fallback to extension if MIME type is not detected
    if (!mimeType || !conversionMap[mimeType]) {
        const ext = file.name.split('.').pop().toLowerCase();
        mimeType = extToMime[ext] || mimeType;
    }

    const availableFormats = conversionMap[mimeType] || [];

    // Populate format dropdown
    outputFormat.innerHTML = '<option value="">Select format...</option>';

    if (availableFormats.length === 0) {
        outputFormat.innerHTML = '<option value="">No conversions available</option>';
    } else {
        availableFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            const icon = formatIcons[format] || '📄';
            option.textContent = `${icon}  ${format.toUpperCase()}`;
            outputFormat.appendChild(option);
        });
    }

    // Show convert section
    showSection('convert');
    convertBtn.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showSection(section) {
    uploadSection.classList.add('hidden');
    convertSection.classList.add('hidden');
    downloadSection.classList.add('hidden');
    errorSection.classList.add('hidden');

    switch (section) {
        case 'upload':
            uploadSection.classList.remove('hidden');
            break;
        case 'convert':
            convertSection.classList.remove('hidden');
            break;
        case 'download':
            downloadSection.classList.remove('hidden');
            break;
        case 'error':
            errorSection.classList.remove('hidden');
            break;
    }
}

function resetToUpload() {
    currentFile = null;
    convertedBlob = null;
    convertedFileName = '';
    fileInput.value = '';
    outputFormat.innerHTML = '<option value="">Select format...</option>';
    showSection('upload');
}

function showError(message) {
    errorText.textContent = message;
    showSection('error');
}

function setLoading(loading) {
    const btnText = convertBtn.querySelector('.btn-text');
    const btnLoader = convertBtn.querySelector('.btn-loader');

    if (loading) {
        btnText.textContent = 'Converting...';
        btnLoader.classList.remove('hidden');
        convertBtn.disabled = true;
    } else {
        btnText.textContent = 'Convert';
        btnLoader.classList.add('hidden');
        convertBtn.disabled = false;
    }
}

async function convertFile() {
    if (!currentFile || !outputFormat.value) return;

    setLoading(true);
    const targetFormat = outputFormat.value;
    const fileBaseName = currentFile.name.replace(/\.[^/.]+$/, '');

    try {
        let result;
        const sourceType = currentFile.type || extToMime[currentFile.name.split('.').pop().toLowerCase()];

        // Image conversions
        if (sourceType.startsWith('image/')) {
            if (targetFormat === 'pdf') {
                result = await imageToePdf(currentFile);
            } else {
                result = await convertImage(currentFile, targetFormat);
            }
        }
        // Text/Document conversions
        else if (sourceType.startsWith('text/') || sourceType === 'application/json' || sourceType === 'application/xml') {
            result = await convertText(currentFile, targetFormat);
        }
        // PDF conversions
        else if (sourceType === 'application/pdf') {
            result = await convertPdf(currentFile, targetFormat);
        }
        // Audio conversions
        else if (sourceType.startsWith('audio/')) {
            result = await convertAudio(currentFile, targetFormat);
        }
        // Video conversions
        else if (sourceType.startsWith('video/')) {
            result = await convertVideo(currentFile, targetFormat);
        }
        // Archive conversions
        else if (sourceType.includes('zip') || sourceType.includes('tar') || sourceType.includes('gzip')) {
            result = await convertArchive(currentFile, targetFormat);
        }
        // Word document conversions
        else if (sourceType.includes('msword') || sourceType.includes('wordprocessingml')) {
            result = await convertDocx(currentFile, targetFormat);
        }
        else {
            throw new Error('Unsupported file type');
        }

        convertedBlob = result;
        convertedFileName = `${fileBaseName}.${targetFormat}`;
        showSection('download');
    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'Conversion failed. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Image conversion using Canvas
async function convertImage(file, targetFormat) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // White background for formats that don't support transparency
            if (['jpg', 'jpeg', 'bmp'].includes(targetFormat)) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            let mimeType = `image/${targetFormat}`;
            if (targetFormat === 'jpg') mimeType = 'image/jpeg';
            if (targetFormat === 'ico') mimeType = 'image/x-icon';

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert image'));
                }
            }, mimeType, 0.92);
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Image to PDF
async function imageToePdf(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: img.width > img.height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [img.width, img.height]
            });

            pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
            const blob = pdf.output('blob');
            resolve(blob);
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Text conversions
async function convertText(file, targetFormat) {
    const text = await file.text();
    const sourceExt = file.name.split('.').pop().toLowerCase();
    let result;

    switch (targetFormat) {
        case 'html':
            if (sourceExt === 'md') {
                result = markdownToHtml(text);
            } else if (sourceExt === 'csv') {
                result = csvToHtml(text);
            } else if (sourceExt === 'json') {
                result = jsonToHtml(text);
            } else {
                result = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
            }
            break;

        case 'md':
            if (sourceExt === 'html' || sourceExt === 'htm') {
                result = htmlToMarkdown(text);
            } else {
                result = text;
            }
            break;

        case 'txt':
            if (sourceExt === 'html' || sourceExt === 'htm') {
                result = htmlToText(text);
            } else if (sourceExt === 'json') {
                result = JSON.stringify(JSON.parse(text), null, 2);
            } else {
                result = text;
            }
            break;

        case 'json':
            if (sourceExt === 'csv') {
                result = JSON.stringify(csvToJson(text), null, 2);
            } else if (sourceExt === 'xml') {
                result = JSON.stringify(xmlToJson(text), null, 2);
            } else {
                result = JSON.stringify({ content: text }, null, 2);
            }
            break;

        case 'csv':
            if (sourceExt === 'json') {
                result = jsonToCsv(text);
            } else {
                result = text;
            }
            break;

        case 'yaml':
            if (sourceExt === 'json') {
                result = jsonToYaml(text);
            } else {
                result = text;
            }
            break;

        case 'pdf':
            return textToPdf(text);

        default:
            result = text;
    }

    return new Blob([result], { type: 'text/plain' });
}

// PDF conversion
async function convertPdf(file, targetFormat) {
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF.js
    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    if (targetFormat === 'txt') {
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            text += pageText + '\n\n';
        }
        return new Blob([text], { type: 'text/plain' });
    }

    if (targetFormat === 'png' || targetFormat === 'jpg') {
        const page = await pdf.getPage(1);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');

        if (targetFormat === 'jpg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert PDF to image'));
            }, targetFormat === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
        });
    }

    if (targetFormat === 'docx') {
        // Use server-side processing for proper editable DOCX conversion
        if (serverAvailable) {
            return await convertViaServer(file, targetFormat);
        }

        // Fallback: Convert PDF pages to images and embed them in DOCX
        // This preserves the visual layout but text is not editable
        console.log('Server unavailable, using image-based PDF to DOCX conversion');
        const pageImages = [];
        const scale = 2; // Higher scale for better quality

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            // Convert canvas to base64 PNG
            const imageData = canvas.toDataURL('image/png').split(',')[1];
            pageImages.push({
                data: imageData,
                width: viewport.width,
                height: viewport.height
            });
        }

        return createDocxFromPdfPages(pageImages);
    }

    throw new Error('Unsupported PDF conversion');
}

// Audio conversion (basic - uses Web Audio API)
async function convertAudio(file, targetFormat) {
    // Note: Full audio conversion requires FFmpeg.wasm which is heavy
    // This is a simplified version that shows a message for complex conversions

    if (targetFormat === 'wav') {
        return await convertToWav(file);
    }

    // For other formats, we'd need FFmpeg.wasm
    throw new Error(`Audio conversion to ${targetFormat.toUpperCase()} requires server-side processing. WAV conversion is available locally.`);
}

async function convertToWav(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create WAV file
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const samples = buffer.length;
    const dataSize = samples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    const offset = 44;
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < samples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = channelData[ch][i];
            sample = Math.max(-1, Math.min(1, sample));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset + (i * blockAlign) + (ch * bytesPerSample), sample, true);
        }
    }

    return arrayBuffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Video conversion (limited - GIF extraction)
async function convertVideo(file, targetFormat) {
    if (targetFormat === 'gif') {
        return await videoToGif(file);
    }

    throw new Error(`Video conversion to ${targetFormat.toUpperCase()} requires server-side processing. GIF extraction is available locally.`);
}

async function videoToGif(file) {
    // Simple first-frame extraction as a placeholder
    // Full GIF creation would require gif.js or similar
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.currentTime = 0;
        };

        video.onseeked = () => {
            ctx.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to extract frame'));
            }, 'image/gif');
        };

        video.onerror = () => reject(new Error('Failed to load video'));

        video.src = URL.createObjectURL(file);
        video.load();
    });
}

// Archive conversion
async function convertArchive(file, targetFormat) {
    if (file.type.includes('zip') && targetFormat === 'tar') {
        throw new Error('ZIP to TAR conversion requires server-side processing');
    }

    if ((file.type.includes('tar') || file.type.includes('gzip')) && targetFormat === 'zip') {
        throw new Error('TAR/GZ to ZIP conversion requires server-side processing');
    }

    throw new Error('Archive conversion is not supported in browser');
}

// DOCX/DOC conversion using mammoth.js
async function convertDocx(file, targetFormat) {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop().toLowerCase();

    // Check if it's old .doc format
    if (ext === 'doc') {
        throw new Error('Legacy .doc format has limited support. Please convert to .docx first using Microsoft Word or LibreOffice.');
    }

    // Use mammoth to extract content with images as base64
    const options = {
        convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
                return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                };
            });
        })
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    const html = result.value;

    switch (targetFormat) {
        case 'html':
            const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        img { max-width: 100%; height: auto; }
        h1 { font-size: 2em; margin: 0.67em 0; }
        h2 { font-size: 1.5em; margin: 0.75em 0; }
        h3 { font-size: 1.17em; margin: 0.83em 0; }
        p { margin: 1em 0; }
        ul, ol { margin: 1em 0; padding-left: 40px; }
        table { border-collapse: collapse; margin: 1em 0; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
${html}
</body>
</html>`;
            return new Blob([fullHtml], { type: 'text/html' });

        case 'txt':
            const textResult = await mammoth.extractRawText({ arrayBuffer });
            return new Blob([textResult.value], { type: 'text/plain' });

        case 'md':
            // Convert HTML to markdown
            const mdContent = htmlToMarkdown(html);
            return new Blob([mdContent], { type: 'text/markdown' });

        case 'pdf':
            // Use server-side processing for better PDF conversion
            if (serverAvailable) {
                return await convertViaServer(file, targetFormat);
            }
            // Fallback: Use HTML with formatting and images for PDF output
            return htmlToPdfWithImages(html);

        default:
            throw new Error(`Conversion to ${targetFormat.toUpperCase()} is not supported for Word documents`);
    }
}

// Text to PDF
async function textToPdf(text) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const lines = pdf.splitTextToSize(text, 180);
    let y = 20;
    const pageHeight = pdf.internal.pageSize.height;

    lines.forEach(line => {
        if (y > pageHeight - 20) {
            pdf.addPage();
            y = 20;
        }
        pdf.text(line, 15, y);
        y += 7;
    });

    return pdf.output('blob');
}

// HTML to PDF with formatting preserved
async function htmlToPdf(htmlContent) {
    // Create a temporary container to render the HTML
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        background: white;
        color: black;
    `;

    // Style headings
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        h1 { font-size: 24px; margin: 20px 0 10px 0; font-weight: bold; }
        h2 { font-size: 20px; margin: 18px 0 8px 0; font-weight: bold; }
        h3 { font-size: 16px; margin: 16px 0 6px 0; font-weight: bold; }
        p { margin: 10px 0; }
        ul, ol { margin: 10px 0; padding-left: 30px; }
        li { margin: 5px 0; }
        table { border-collapse: collapse; margin: 15px 0; }
        td, th { border: 1px solid #ccc; padding: 8px; }
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
    `;
    container.appendChild(styleSheet);
    document.body.appendChild(container);

    try {
        // Use html2canvas to render the HTML
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { jsPDF } = window.jspdf;

        // Calculate dimensions
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'a4');
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
}

// HTML to PDF with better formatting for DOCX conversion
async function htmlToPdfWithImages(htmlContent) {
    // Create a container with proper A4 styling
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 595px;
        min-height: 842px;
        padding: 50px;
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        background: white;
        color: black;
        box-sizing: border-box;
    `;

    // Apply document-like styling
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        * { box-sizing: border-box; }
        h1 { font-size: 18pt; margin: 24pt 0 12pt 0; font-weight: bold; }
        h2 { font-size: 16pt; margin: 20pt 0 10pt 0; font-weight: bold; }
        h3 { font-size: 14pt; margin: 16pt 0 8pt 0; font-weight: bold; }
        h4 { font-size: 12pt; margin: 14pt 0 6pt 0; font-weight: bold; }
        p { margin: 0 0 12pt 0; text-align: justify; }
        ul, ol { margin: 12pt 0; padding-left: 36pt; }
        li { margin: 6pt 0; }
        table { border-collapse: collapse; margin: 12pt 0; width: 100%; }
        td, th { border: 1px solid #000; padding: 6pt; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        u { text-decoration: underline; }
        img { max-width: 100%; height: auto; margin: 12pt 0; }
        blockquote { margin: 12pt 24pt; padding-left: 12pt; border-left: 3px solid #ccc; }
    `;
    container.insertBefore(styleSheet, container.firstChild);
    document.body.appendChild(container);

    // Wait for images to load
    const images = container.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }));

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: 595,
            windowWidth: 595
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;

        // A4 dimensions in mm
        const pdfWidth = 210;
        const pdfHeight = 297;

        // Calculate scaling
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'a4');

        // Handle multi-page documents
        let heightLeft = imgHeight;
        let position = 0;
        let pageNum = 0;

        while (heightLeft > 0) {
            if (pageNum > 0) {
                pdf.addPage();
            }

            // Calculate the slice of the image for this page
            const sourceY = pageNum * (canvas.height * pdfHeight / imgHeight);
            const sourceHeight = Math.min(canvas.height - sourceY, canvas.height * pdfHeight / imgHeight);

            // Create a canvas for this page slice
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sourceHeight;
            const ctx = pageCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

            const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
            const pageImgHeight = (sourceHeight * pdfWidth) / canvas.width;

            pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pageImgHeight);

            heightLeft -= pdfHeight;
            pageNum++;
        }

        return pdf.output('blob');
    } finally {
        document.body.removeChild(container);
    }
}

// Create DOCX from text using JSZip
async function createDocxFromText(text) {
    // DOCX is a ZIP file containing XML files
    const zip = new JSZip();

    // Split text into paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim());

    // Create paragraph XML
    const paragraphsXml = paragraphs.map(p => `
        <w:p>
            <w:r>
                <w:t>${escapeXml(p)}</w:t>
            </w:r>
        </w:p>
    `).join('');

    // Document content
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        ${paragraphsXml}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
        </w:sectPr>
    </w:body>
</w:document>`;

    // Content types
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    // Relationships
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    // Add files to ZIP
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', relsXml);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', documentRelsXml);

    // Generate the DOCX file
    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return blob;
}

// Escape XML special characters
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Create DOCX from PDF pages (as images) - preserves visual layout
async function createDocxFromPdfPages(pageImages) {
    const zip = new JSZip();

    // EMU (English Metric Units) conversion: 1 inch = 914400 EMUs
    // A4 page is approximately 8.27 x 11.69 inches
    const pageWidthEmu = 7560000; // ~8.27 inches with margins
    const pageHeightEmu = 10692000; // ~11.69 inches with margins

    // Create image relationships and references
    let imageRels = '';
    let imageParagraphs = '';

    for (let i = 0; i < pageImages.length; i++) {
        const img = pageImages[i];
        const rId = `rId${i + 1}`;
        const imgFilename = `image${i + 1}.png`;

        // Add image to zip
        zip.file(`word/media/${imgFilename}`, img.data, { base64: true });

        // Calculate image dimensions to fit page width while maintaining aspect ratio
        const aspectRatio = img.height / img.width;
        const imgWidthEmu = pageWidthEmu;
        const imgHeightEmu = Math.round(pageWidthEmu * aspectRatio);

        // Add relationship
        imageRels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFilename}"/>`;

        // Add image paragraph with page break after (except for last page)
        imageParagraphs += `
        <w:p>
            <w:r>
                <w:drawing>
                    <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
                        <wp:extent cx="${imgWidthEmu}" cy="${imgHeightEmu}"/>
                        <wp:docPr id="${i + 1}" name="Picture ${i + 1}"/>
                        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                    <pic:nvPicPr>
                                        <pic:cNvPr id="${i + 1}" name="image${i + 1}.png"/>
                                        <pic:cNvPicPr/>
                                    </pic:nvPicPr>
                                    <pic:blipFill>
                                        <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                                        <a:stretch>
                                            <a:fillRect/>
                                        </a:stretch>
                                    </pic:blipFill>
                                    <pic:spPr>
                                        <a:xfrm>
                                            <a:off x="0" y="0"/>
                                            <a:ext cx="${imgWidthEmu}" cy="${imgHeightEmu}"/>
                                        </a:xfrm>
                                        <a:prstGeom prst="rect">
                                            <a:avLst/>
                                        </a:prstGeom>
                                    </pic:spPr>
                                </pic:pic>
                            </a:graphicData>
                        </a:graphic>
                    </wp:inline>
                </w:drawing>
            </w:r>
            ${i < pageImages.length - 1 ? '<w:r><w:br w:type="page"/></w:r>' : ''}
        </w:p>`;
    }

    // Document content
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <w:body>
        ${imageParagraphs}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
        </w:sectPr>
    </w:body>
</w:document>`;

    // Content types with PNG support
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="png" ContentType="image/png"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    // Root relationships
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    // Document relationships with images
    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    ${imageRels}
</Relationships>`;

    // Add files to ZIP
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', relsXml);
    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', documentRelsXml);

    // Generate the DOCX file
    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return blob;
}

// Helper functions for text conversion
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function markdownToHtml(md) {
    // Simple markdown conversion
    let html = md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title></head><body>${html}</body></html>`;
}

function htmlToMarkdown(html) {
    return html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .trim();
}

function htmlToText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function csvToJson(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        result.push(obj);
    }

    return result;
}

function jsonToCsv(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header] || '';
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        });
        csv.push(values.join(','));
    });

    return csv.join('\n');
}

function csvToHtml(csv) {
    const lines = csv.trim().split('\n');
    let html = '<table border="1" cellpadding="5" cellspacing="0">';

    lines.forEach((line, index) => {
        const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
        const tag = index === 0 ? 'th' : 'td';
        html += '<tr>';
        cells.forEach(cell => {
            html += `<${tag}>${escapeHtml(cell)}</${tag}>`;
        });
        html += '</tr>';
    });

    html += '</table>';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title><style>table{border-collapse:collapse;}</style></head><body>${html}</body></html>`;
}

function jsonToHtml(jsonStr) {
    const data = JSON.parse(jsonStr);
    const html = `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Converted</title></head><body>${html}</body></html>`;
}

function xmlToJson(xml) {
    // Simple XML to JSON conversion
    const result = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    function parseNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim();
        }

        const obj = {};
        if (node.attributes) {
            for (let attr of node.attributes) {
                obj['@' + attr.name] = attr.value;
            }
        }

        for (let child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent.trim();
                if (text) obj['#text'] = text;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const parsed = parseNode(child);
                if (obj[child.nodeName]) {
                    if (!Array.isArray(obj[child.nodeName])) {
                        obj[child.nodeName] = [obj[child.nodeName]];
                    }
                    obj[child.nodeName].push(parsed);
                } else {
                    obj[child.nodeName] = parsed;
                }
            }
        }

        return obj;
    }

    result[doc.documentElement.nodeName] = parseNode(doc.documentElement);
    return result;
}

function jsonToYaml(jsonStr) {
    const data = JSON.parse(jsonStr);

    function toYaml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';

        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    yaml += `${spaces}-\n${toYaml(item, indent + 1)}`;
                } else {
                    yaml += `${spaces}- ${item}\n`;
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    yaml += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
                } else {
                    yaml += `${spaces}${key}: ${value}\n`;
                }
            }
        } else {
            yaml += `${obj}\n`;
        }

        return yaml;
    }

    return toYaml(data);
}

function downloadFile() {
    if (!convertedBlob || !convertedFileName) return;
    saveAs(convertedBlob, convertedFileName);
}
