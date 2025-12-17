#!/usr/bin/env python3
"""
PDF to DOCX converter using pdf2docx library.
This script is called by the Node.js server for high-quality PDF to DOCX conversion.

Usage: python pdf2docx_converter.py <input.pdf> <output.docx>

Requirements:
    pip install pdf2docx
"""

import sys
import os

def convert_pdf_to_docx(input_path, output_path):
    """Convert PDF to DOCX with preserved formatting."""
    try:
        from pdf2docx import Converter
    except ImportError:
        print("Error: pdf2docx is not installed. Run: pip install pdf2docx", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        # Create converter
        cv = Converter(input_path)

        # Convert all pages
        cv.convert(output_path)

        # Close the converter
        cv.close()

        print(f"Successfully converted: {output_path}")

    except Exception as e:
        print(f"Conversion error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf2docx_converter.py <input.pdf> <output.docx>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    convert_pdf_to_docx(input_file, output_file)
