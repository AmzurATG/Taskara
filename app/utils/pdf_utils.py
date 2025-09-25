import PyPDF2
import requests
import tempfile
import os
from typing import Optional, List
from pathlib import Path


class PDFExtractor:
    @staticmethod
    def _download_file_from_url(url: str) -> str:
        """Download file from URL and return temporary file path."""
        try:
            # Clean URL - remove any trailing characters
            url = url.rstrip('?')
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()
            
            return temp_file.name
        except Exception as e:
            raise Exception(f"Error downloading file from URL: {str(e)}")
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF file (supports both local paths and URLs)."""
        temp_file_path = None
        try:
            # Check if it's a URL
            if file_path.startswith('http'):
                temp_file_path = PDFExtractor._download_file_from_url(file_path)
                actual_file_path = temp_file_path
            else:
                actual_file_path = file_path
            
            text = ""
            with open(actual_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            
            return text.strip()
        
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
        
        finally:
            # Clean up temporary file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass
    
    @staticmethod
    def extract_text_by_pages(file_path: str) -> List[str]:
        """Extract text from PDF file, returning list of pages (supports both local paths and URLs)."""
        temp_file_path = None
        try:
            # Check if it's a URL
            if file_path.startswith('http'):
                temp_file_path = PDFExtractor._download_file_from_url(file_path)
                actual_file_path = temp_file_path
            else:
                actual_file_path = file_path
            
            pages = []
            with open(actual_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text().strip()
                    if page_text:  # Only add non-empty pages
                        pages.append(page_text)
            
            return pages
        
        except Exception as e:
            raise Exception(f"Error extracting pages from PDF: {str(e)}")
        
        finally:
            # Clean up temporary file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass
    
    @staticmethod
    def get_pdf_info(file_path: str) -> dict:
        """Get PDF metadata information (supports both local paths and URLs)."""
        temp_file_path = None
        try:
            # Check if it's a URL
            if file_path.startswith('http'):
                temp_file_path = PDFExtractor._download_file_from_url(file_path)
                actual_file_path = temp_file_path
            else:
                actual_file_path = file_path
            
            with open(actual_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                info = {
                    "num_pages": len(pdf_reader.pages),
                    "title": pdf_reader.metadata.get('/Title', '') if pdf_reader.metadata else '',
                    "author": pdf_reader.metadata.get('/Author', '') if pdf_reader.metadata else '',
                    "subject": pdf_reader.metadata.get('/Subject', '') if pdf_reader.metadata else '',
                    "creator": pdf_reader.metadata.get('/Creator', '') if pdf_reader.metadata else '',
                }
                
                return info
        
        except Exception as e:
            raise Exception(f"Error getting PDF info: {str(e)}")
        
        finally:
            # Clean up temporary file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass
