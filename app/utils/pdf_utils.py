import PyPDF2
from typing import Optional, List
from pathlib import Path


class PDFExtractor:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF file."""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            
            return text.strip()
        
        except Exception as e:
            raise Exception(f"Error extracting text from PDF: {str(e)}")
    
    @staticmethod
    def extract_text_by_pages(file_path: str) -> List[str]:
        """Extract text from PDF file, returning list of pages."""
        try:
            pages = []
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text().strip()
                    if page_text:  # Only add non-empty pages
                        pages.append(page_text)
            
            return pages
        
        except Exception as e:
            raise Exception(f"Error extracting pages from PDF: {str(e)}")
    
    @staticmethod
    def get_pdf_info(file_path: str) -> dict:
        """Get PDF metadata information."""
        try:
            with open(file_path, 'rb') as file:
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
