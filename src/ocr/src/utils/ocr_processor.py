import cv2
import numpy as np
import easyocr
from typing import List, Dict, Tuple, Optional


class OCRProcessor:
    """EasyOCR processor for license plate text recognition"""

    def __init__(self, languages=['en']):
        """
        Initialize EasyOCR reader

        Args:
            languages: List of languages for OCR (default: ['en'])
        """
        self.reader = easyocr.Reader(languages, gpu=True)

    def read_text(self, image: np.ndarray) -> str:
        """
        Extract text from image using EasyOCR

        Args:
            image: BGR image (numpy array)

        Returns:
            Extracted text string
        """
        result = self.reader.readtext(image, detail=0)
        text = ''.join(result)
        text = text.upper().replace(' ', '')
        return text

    def read_text_with_confidence(self, image: np.ndarray) -> Tuple[str, float]:
        """
        Extract text with average confidence score

        Args:
            image: BGR image (numpy array)

        Returns:
            Tuple of (text, average_confidence)
        """
        result = self.reader.readtext(image, detail=1)

        if not result:
            return "", 0.0

        texts = []
        confidences = []

        for bbox, text, prob in result:
            texts.append(text)
            confidences.append(prob)

        final_text = ''.join(texts)
        final_text = final_text.upper().replace(' ', '')
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return final_text, avg_confidence

    def read_text_with_positions(self, image: np.ndarray) -> List[Dict]:
        """
        Extract text with character-level positions and confidence

        Args:
            image: BGR image (numpy array)

        Returns:
            List of dictionaries containing char, prob, and bbox for each character
        """
        result = self.reader.readtext(image, detail=1)
        extracted = []

        for bbox, text, prob in result:
            # bbox: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
            x_min = min([p[0] for p in bbox])
            x_max = max([p[0] for p in bbox])
            y_min = min([p[1] for p in bbox])
            y_max = max([p[1] for p in bbox])

            # Split the bounding box horizontally per character
            char_width = (x_max - x_min) / max(len(text), 1)
            for i, ch in enumerate(text):
                char_x_min = x_min + i * char_width
                char_x_max = char_x_min + char_width
                char_info = {
                    'char': ch,
                    'prob': float(prob),
                    'bbox': [char_x_min, y_min, char_x_max, y_max]
                }
                extracted.append(char_info)

        return extracted