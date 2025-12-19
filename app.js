// WildConverter - Frontend Application
// All conversions are handled by the Python backend server

// Server API configuration
const API_BASE = '/api';

// Conversion format mappings - all handled server-side
const conversionMap = {
    // Images
    'image/jpeg': ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
    'image/jpg': ['png', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
    'image/png': ['jpg', 'webp', 'gif', 'bmp', 'tiff', 'pdf'],
    'image/webp': ['jpg', 'png', 'gif', 'bmp', 'tiff', 'pdf'],
    'image/gif': ['jpg', 'png', 'webp', 'bmp', 'tiff', 'pdf'],
    'image/bmp': ['jpg', 'png', 'webp', 'gif', 'tiff', 'pdf'],
    'image/tiff': ['jpg', 'png', 'webp', 'gif', 'bmp', 'pdf'],

    // PDF
    'application/pdf': ['docx', 'txt', 'png', 'jpg'],

    // Word Documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'txt', 'html'],
    'application/msword': ['pdf', 'txt', 'html'],

    // Text/Markup
    'text/plain': ['pdf', 'html'],
    'text/html': ['pdf', 'txt'],
    'text/markdown': ['html', 'pdf', 'txt'],

    // Data Formats
    'text/csv': ['json', 'xlsx', 'txt'],
    'application/json': ['csv', 'xml', 'yaml', 'txt'],
    'application/xml': ['json', 'txt'],
    'text/xml': ['json', 'txt'],
    'application/x-yaml': ['json', 'txt'],
    'text/yaml': ['json', 'txt'],

    // Excel
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['csv', 'json'],
    'application/vnd.ms-excel': ['csv', 'json'],

    // Audio Formats
    'audio/mpeg': ['wav', 'ogg', 'flac', 'aac', 'm4a'],
    'audio/mp3': ['wav', 'ogg', 'flac', 'aac', 'm4a'],
    'audio/wav': ['mp3', 'ogg', 'flac', 'aac', 'm4a'],
    'audio/ogg': ['mp3', 'wav', 'flac', 'aac', 'm4a'],
    'audio/flac': ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
    'audio/aac': ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
    'audio/mp4': ['mp3', 'wav', 'ogg', 'flac', 'aac'],
    'audio/x-m4a': ['mp3', 'wav', 'ogg', 'flac', 'aac'],

    // Video Formats
    'video/mp4': ['webm', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav'],
    'video/webm': ['mp4', 'avi', 'mov', 'mkv', 'gif', 'mp3', 'wav'],
    'video/x-msvideo': ['mp4', 'webm', 'mov', 'mkv', 'gif', 'mp3', 'wav'],
    'video/avi': ['mp4', 'webm', 'mov', 'mkv', 'gif', 'mp3', 'wav'],
    'video/quicktime': ['mp4', 'webm', 'avi', 'mkv', 'gif', 'mp3', 'wav'],
    'video/x-matroska': ['mp4', 'webm', 'avi', 'mov', 'gif', 'mp3', 'wav'],

    // Archive Formats
    'application/zip': ['tar', 'tar.gz', 'tgz', '7z'],
    'application/x-zip-compressed': ['tar', 'tar.gz', 'tgz', '7z'],
    'application/x-tar': ['zip', 'tar.gz', 'tgz', '7z'],
    'application/gzip': ['zip', 'tar', '7z'],
    'application/x-gzip': ['zip', 'tar', '7z'],
    'application/x-7z-compressed': ['zip', 'tar', 'tar.gz', 'tgz'],
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
    'tiff': '🖼️',
    // Documents
    'pdf': '📄',
    'docx': '📘',
    'doc': '📘',
    'txt': '📝',
    'html': '🌐',
    'md': '📑',
    // Data
    'csv': '📊',
    'json': '{ }',
    'xml': '📋',
    'yaml': '📋',
    'xlsx': '📊',
    'xls': '📊',
    // Audio
    'mp3': '🎵',
    'wav': '🎵',
    'ogg': '🎵',
    'flac': '🎵',
    'aac': '🎵',
    'm4a': '🎵',
    'wma': '🎵',
    // Video
    'mp4': '🎬',
    'webm': '🎬',
    'avi': '🎬',
    'mov': '🎬',
    'mkv': '🎬',
    'wmv': '🎬',
    'flv': '🎬',
    // Archives
    'zip': '📦',
    'tar': '📦',
    'tar.gz': '📦',
    'tgz': '📦',
    '7z': '📦',
};

// Extension to MIME type mapping
const extToMime = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    // Documents
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'html': 'text/html',
    'htm': 'text/html',
    'md': 'text/markdown',
    // Data
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'wma': 'audio/x-ms-wma',
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'tar.gz': 'application/gzip',
    'tgz': 'application/gzip',
    '7z': 'application/x-7z-compressed',
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

// Helper function to get file extension (handles compound extensions like .tar.gz)
function getFileExtension(filename) {
    const lowerName = filename.toLowerCase();
    // Check for compound extensions first
    if (lowerName.endsWith('.tar.gz')) return 'tar.gz';
    if (lowerName.endsWith('.tar.bz2')) return 'tar.bz2';
    // Fall back to simple extension
    return filename.split('.').pop().toLowerCase();
}

// Functions
function handleFile(file) {
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    // Get available conversions
    let mimeType = file.type;

    // Fallback to extension if MIME type is not detected
    if (!mimeType || !conversionMap[mimeType]) {
        const ext = getFileExtension(file.name);
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
        // All conversions go through the server
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('targetFormat', targetFormat);

        const response = await fetch(`${API_BASE}/convert`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        convertedBlob = await response.blob();
        convertedFileName = `${fileBaseName}.${targetFormat}`;
        showSection('download');
    } catch (error) {
        console.error('Conversion error:', error);
        showError(error.message || 'Conversion failed. Please try again.');
    } finally {
        setLoading(false);
    }
}

function downloadFile() {
    if (!convertedBlob || !convertedFileName) return;
    saveAs(convertedBlob, convertedFileName);
}
