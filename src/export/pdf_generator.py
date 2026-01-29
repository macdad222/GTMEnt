"""PDF generator for playbooks."""

from typing import Optional
from datetime import datetime
import io

from fpdf import FPDF

from src.playbook.models import Playbook, PlaybookSection


class PlaybookPDF(FPDF):
    """Custom PDF class with branding and styling."""

    # Brand colors (RGB tuples)
    BRAND_BLUE = (0, 102, 204)
    ACCENT_ORANGE = (236, 118, 18)
    TEXT_DARK = (30, 41, 59)
    TEXT_GRAY = (100, 116, 139)
    BG_LIGHT = (248, 250, 252)

    def __init__(self, playbook_name: str):
        super().__init__()
        self.playbook_name = playbook_name

    def header(self):
        """Add page header."""
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*self.BRAND_BLUE)
        self.cell(0, 10, "Comcast Business | Enterprise Strategy Platform", 0, 0, "L")
        self.ln(15)

    def footer(self):
        """Add page footer."""
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*self.TEXT_GRAY)
        self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")


class PDFGenerator:
    """
    Generate PDF documents from playbooks.

    Produces consulting-grade PDF reports with:
    - Cover page
    - Table of contents
    - Section pages with narrative + key points
    - Appendix with citations and assumptions
    """

    def __init__(self):
        self.pdf: Optional[PlaybookPDF] = None

    def generate(self, playbook: Playbook, include_appendix: bool = True) -> bytes:
        """
        Generate a PDF file from a playbook.

        Args:
            playbook: The playbook to convert
            include_appendix: Whether to include citations/assumptions appendix

        Returns:
            PDF file as bytes
        """
        self.pdf = PlaybookPDF(playbook.name)
        self.pdf.set_auto_page_break(auto=True, margin=20)

        # Cover page
        self._add_cover_page(playbook)

        # Table of contents
        self._add_toc_page(playbook)

        # Content sections
        for section in playbook.sections:
            if section.section_type != "appendix":
                self._add_section_page(section)

        # Appendix
        if include_appendix:
            self._add_appendix_page(playbook)

        # Export to bytes
        return bytes(self.pdf.output())

    def _add_cover_page(self, playbook: Playbook) -> None:
        """Add cover page."""
        self.pdf.add_page()

        # Title area
        self.pdf.set_y(80)
        self.pdf.set_font("Helvetica", "B", 32)
        self.pdf.set_text_color(*self.pdf.TEXT_DARK)
        self.pdf.multi_cell(0, 15, playbook.name, align="L")

        # Description
        self.pdf.ln(10)
        self.pdf.set_font("Helvetica", "", 14)
        self.pdf.set_text_color(*self.pdf.TEXT_GRAY)
        self.pdf.multi_cell(0, 8, playbook.description)

        # Date
        self.pdf.set_y(250)
        self.pdf.set_font("Helvetica", "", 11)
        self.pdf.cell(0, 10, f"Generated: {datetime.utcnow().strftime('%B %d, %Y')}", 0, 1, "L")

        # Branding
        self.pdf.set_font("Helvetica", "B", 12)
        self.pdf.set_text_color(*self.pdf.BRAND_BLUE)
        self.pdf.cell(0, 10, "Comcast Business | Enterprise Strategy Platform", 0, 1, "L")

    def _add_toc_page(self, playbook: Playbook) -> None:
        """Add table of contents."""
        self.pdf.add_page()

        self.pdf.set_font("Helvetica", "B", 24)
        self.pdf.set_text_color(*self.pdf.TEXT_DARK)
        self.pdf.cell(0, 15, "Table of Contents", 0, 1, "L")
        self.pdf.ln(10)

        self.pdf.set_font("Helvetica", "", 12)
        for i, section in enumerate(playbook.sections, 1):
            self.pdf.set_text_color(*self.pdf.BRAND_BLUE)
            self.pdf.cell(10, 8, f"{i}.", 0, 0, "L")
            self.pdf.set_text_color(*self.pdf.TEXT_DARK)
            self.pdf.cell(0, 8, section.title, 0, 1, "L")

    def _add_section_page(self, section: PlaybookSection) -> None:
        """Add a section content page."""
        self.pdf.add_page()

        # Section title
        self.pdf.set_font("Helvetica", "B", 20)
        self.pdf.set_text_color(*self.pdf.TEXT_DARK)
        self.pdf.multi_cell(0, 12, section.title)
        self.pdf.ln(5)

        # Narrative
        if section.narrative:
            self.pdf.set_font("Helvetica", "", 11)
            self.pdf.set_text_color(*self.pdf.TEXT_GRAY)
            self.pdf.multi_cell(0, 6, section.narrative)
            self.pdf.ln(8)

        # Key points
        if section.key_points:
            self.pdf.set_font("Helvetica", "B", 12)
            self.pdf.set_text_color(*self.pdf.ACCENT_ORANGE)
            self.pdf.cell(0, 8, "Key Points", 0, 1, "L")

            self.pdf.set_font("Helvetica", "", 11)
            self.pdf.set_text_color(*self.pdf.TEXT_DARK)
            for point in section.key_points:
                self.pdf.cell(5, 6, "", 0, 0)  # Indent
                self.pdf.cell(5, 6, "•", 0, 0)
                self.pdf.multi_cell(0, 6, point)

    def _add_appendix_page(self, playbook: Playbook) -> None:
        """Add appendix with citations and assumptions."""
        self.pdf.add_page()

        self.pdf.set_font("Helvetica", "B", 20)
        self.pdf.set_text_color(*self.pdf.TEXT_DARK)
        self.pdf.cell(0, 12, "Appendix: Sources & Assumptions", 0, 1, "L")
        self.pdf.ln(8)

        citations = playbook.get_all_citations()
        assumptions = playbook.get_all_assumptions()

        if citations:
            self.pdf.set_font("Helvetica", "B", 14)
            self.pdf.set_text_color(*self.pdf.ACCENT_ORANGE)
            self.pdf.cell(0, 10, "Sources", 0, 1, "L")

            self.pdf.set_font("Helvetica", "", 10)
            self.pdf.set_text_color(*self.pdf.TEXT_GRAY)
            for cit in citations[:10]:
                self.pdf.multi_cell(0, 5, f"• {cit.to_footnote()}")
            self.pdf.ln(5)

        if assumptions:
            self.pdf.set_font("Helvetica", "B", 14)
            self.pdf.set_text_color(*self.pdf.ACCENT_ORANGE)
            self.pdf.cell(0, 10, "Key Assumptions", 0, 1, "L")

            self.pdf.set_font("Helvetica", "", 10)
            self.pdf.set_text_color(*self.pdf.TEXT_GRAY)
            for asm in assumptions[:10]:
                self.pdf.multi_cell(0, 5, f"• {asm.description}: {asm.value}")

