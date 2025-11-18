from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from datetime import datetime
from io import BytesIO
from typing import Dict, Optional
import logging
import os
import urllib.request

logger = logging.getLogger(__name__)


class PDFReportGenerator:
    def __init__(self):
        self._register_fonts()

    def _register_fonts(self):
        """Register Unicode fonts that support Cyrillic characters"""
        try:
            # Try to find DejaVu fonts in common locations
            font_paths = [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/dejavu/DejaVuSans.ttf',
                '/System/Library/Fonts/Supplemental/DejaVuSans.ttf',
                '/Library/Fonts/DejaVuSans.ttf',
                'DejaVuSans.ttf',
                './fonts/DejaVuSans.ttf',
                str(os.path.expanduser('~/Library/Fonts/DejaVuSans.ttf')),
            ]

            dejavu_font = None
            for path in font_paths:
                if os.path.exists(path):
                    dejavu_font = path
                    logger.info(f"Found DejaVu font at: {path}")
                    break

            # If not found, download it
            if not dejavu_font:
                logger.info("DejaVu font not found locally, downloading...")
                os.makedirs('./fonts', exist_ok=True)

                # Use direct TTF links
                dejavu_sans_url = 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf'
                dejavu_sans_bold_url = 'https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans-Bold.ttf'

                dejavu_font = './fonts/DejaVuSans.ttf'
                dejavu_bold_font = './fonts/DejaVuSans-Bold.ttf'

                try:
                    logger.info(f"Downloading fonts to {dejavu_font}")
                    urllib.request.urlretrieve(dejavu_sans_url, dejavu_font)
                    urllib.request.urlretrieve(dejavu_sans_bold_url, dejavu_bold_font)
                    logger.info("DejaVu fonts downloaded successfully")
                except Exception as e:
                    logger.error(f"Failed to download DejaVu fonts: {e}")
                    logger.warning("Falling back to built-in fonts - Cyrillic characters may not display correctly")
                    return

            # Verify font file exists and is readable
            if not os.path.exists(dejavu_font):
                logger.error(f"Font file not found: {dejavu_font}")
                logger.warning("Using built-in fonts - Cyrillic characters may not display correctly")
                return

            # Register the fonts
            try:
                pdfmetrics.registerFont(TTFont('DejaVu', dejavu_font))
                logger.info(f"Registered font 'DejaVu' from {dejavu_font}")

                # Try to register bold variant
                dejavu_bold = dejavu_font.replace('DejaVuSans.ttf', 'DejaVuSans-Bold.ttf')
                if os.path.exists(dejavu_bold):
                    pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_bold))
                    logger.info(f"Registered font 'DejaVu-Bold' from {dejavu_bold}")
                else:
                    # Use regular font for bold too
                    pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_font))
                    logger.info("Using regular DejaVu for bold variant")

                logger.info("Unicode fonts registered successfully")
            except Exception as reg_error:
                logger.error(f"Error during font registration: {reg_error}", exc_info=True)
                logger.warning("Using built-in fonts - Cyrillic characters may not display correctly")

        except Exception as e:
            logger.error(f"Error in font setup: {e}", exc_info=True)
            logger.warning("Using built-in fonts - Cyrillic characters may not display correctly")

    def generate_violation_report(
        self,
        violation_data: Dict,
        user_data: Dict,
        photos: list = None
    ) -> BytesIO:
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        y_position = height - 2 * cm

        # Use DejaVu font for all text
        try:
            pdf.setFont("DejaVu-Bold", 16)
        except:
            pdf.setFont("Helvetica-Bold", 16)

        pdf.setTitle("Звернення щодо порушення правил паркування")

        # Title
        try:
            pdf.setFont("DejaVu-Bold", 16)
        except:
            pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(2 * cm, y_position, "ЗВЕРНЕННЯ")
        y_position -= 0.8 * cm

        try:
            pdf.setFont("DejaVu", 12)
        except:
            pdf.setFont("Helvetica", 12)
        pdf.drawString(2 * cm, y_position, "щодо порушення правил паркування")
        y_position -= 1.5 * cm

        # Date and Case Number
        try:
            pdf.setFont("DejaVu-Bold", 11)
        except:
            pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(2 * cm, y_position, "Дата та час створення:")
        try:
            pdf.setFont("DejaVu", 11)
        except:
            pdf.setFont("Helvetica", 11)
        pdf.drawString(8 * cm, y_position, datetime.utcnow().strftime("%d.%m.%Y %H:%M"))
        y_position -= 1 * cm

        try:
            pdf.setFont("DejaVu-Bold", 11)
        except:
            pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(2 * cm, y_position, "Номер справи:")
        try:
            pdf.setFont("DejaVu", 11)
        except:
            pdf.setFont("Helvetica", 11)
        pdf.drawString(8 * cm, y_position, violation_data.get("police_case_number", "Не присвоєно"))
        y_position -= 1.5 * cm

        # Applicant Information Section
        try:
            pdf.setFont("DejaVu-Bold", 12)
        except:
            pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, y_position, "Інформація про заявника:")
        y_position -= 0.7 * cm
        pdf.line(2 * cm, y_position, width - 2 * cm, y_position)
        y_position -= 0.5 * cm

        try:
            pdf.setFont("DejaVu", 10)
        except:
            pdf.setFont("Helvetica", 10)
        pdf.drawString(2.5 * cm, y_position, f"ПІБ: {user_data.get('full_name', 'Не вказано')}")
        y_position -= 0.6 * cm
        pdf.drawString(2.5 * cm, y_position, f"Телефон: {user_data.get('phone', 'Не вказано')}")
        y_position -= 0.6 * cm
        pdf.drawString(2.5 * cm, y_position, f"Email: {user_data.get('email', 'Не вказано')}")
        y_position -= 1.2 * cm

        # Violation Information Section
        try:
            pdf.setFont("DejaVu-Bold", 12)
        except:
            pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, y_position, "Інформація про порушення:")
        y_position -= 0.7 * cm
        pdf.line(2 * cm, y_position, width - 2 * cm, y_position)
        y_position -= 0.5 * cm

        try:
            pdf.setFont("DejaVu", 10)
        except:
            pdf.setFont("Helvetica", 10)
        pdf.drawString(2.5 * cm, y_position, f"Номерний знак: {violation_data.get('license_plate', 'Не розпізнано')}")
        y_position -= 0.6 * cm

        if violation_data.get('violation_reason'):
            pdf.drawString(2.5 * cm, y_position, f"Причина порушення: {violation_data['violation_reason']}")
            y_position -= 0.6 * cm

        if violation_data.get('violation_code'):
            pdf.drawString(2.5 * cm, y_position, f"Код порушення: {violation_data['violation_code']}")
            y_position -= 0.6 * cm

        pdf.drawString(2.5 * cm, y_position, f"Місце порушення: {violation_data.get('address', 'Не вказано')}")
        y_position -= 0.6 * cm

        coords = f"{violation_data.get('latitude', 0):.6f}, {violation_data.get('longitude', 0):.6f}"
        pdf.drawString(2.5 * cm, y_position, f"Координати: {coords}")
        y_position -= 0.6 * cm

        if violation_data.get('has_road_sign_photo'):
            pdf.drawString(2.5 * cm, y_position, "Фото дорожнього знаку: Так")
            y_position -= 0.6 * cm
        elif violation_data.get('timer_started_at'):
            timer_start = violation_data['timer_started_at']
            if isinstance(timer_start, str):
                timer_str = timer_start
            else:
                timer_str = timer_start.strftime('%d.%m.%Y %H:%M')
            pdf.drawString(2.5 * cm, y_position, f"Таймер 5 хвилин розпочато: {timer_str}")
            y_position -= 0.6 * cm

        if violation_data.get('verification_time_seconds'):
            time_parked = violation_data['verification_time_seconds'] // 60
            pdf.drawString(2.5 * cm, y_position, f"Час паркування: {time_parked} хвилин (підтверджено)")
            y_position -= 0.6 * cm

        created_at = violation_data.get('created_at', datetime.utcnow())
        if isinstance(created_at, str):
            date_str = created_at
        else:
            date_str = created_at.strftime('%d.%m.%Y %H:%M')
        pdf.drawString(2.5 * cm, y_position, f"Дата фіксації: {date_str}")
        y_position -= 1.2 * cm

        # Additional Information
        if violation_data.get('notes'):
            try:
                pdf.setFont("DejaVu-Bold", 12)
            except:
                pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(2 * cm, y_position, "Додаткова інформація:")
            y_position -= 0.7 * cm
            try:
                pdf.setFont("DejaVu", 10)
                font_name = "DejaVu"
            except:
                pdf.setFont("Helvetica", 10)
                font_name = "Helvetica"

            text = violation_data['notes']
            max_width = width - 5 * cm
            from reportlab.pdfbase.pdfmetrics import stringWidth

            words = text.split()
            lines = []
            current_line = []

            for word in words:
                test_line = ' '.join(current_line + [word])
                if stringWidth(test_line, font_name, 10) <= max_width:
                    current_line.append(word)
                else:
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [word]

            if current_line:
                lines.append(' '.join(current_line))

            for line in lines:
                pdf.drawString(2.5 * cm, y_position, line)
                y_position -= 0.6 * cm

            y_position -= 0.6 * cm

        # Photo Evidence
        if photos:
            try:
                pdf.setFont("DejaVu-Bold", 12)
            except:
                pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(2 * cm, y_position, f"Фотодокази: {len(photos)} шт.")
            y_position -= 0.7 * cm

        # Footer
        y_position -= 1 * cm
        try:
            pdf.setFont("DejaVu", 9)
        except:
            pdf.setFont("Helvetica", 9)
        pdf.drawString(2 * cm, y_position, "Згенеровано автоматично через систему Дія")
        y_position -= 0.5 * cm
        pdf.drawString(2 * cm, y_position, f"ID звернення: {violation_data.get('id', 'N/A')}")

        pdf.showPage()
        pdf.save()

        buffer.seek(0)
        return buffer

    def generate_summary_report(
        self,
        conversation_data: Dict,
        violation_data: Dict,
        user_data: Dict
    ) -> BytesIO:
        return self.generate_violation_report(violation_data, user_data)
