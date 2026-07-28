"""
app/models/translation.py

Compatibility module re-exporting TranslationHistory from app.models.db_models.
"""

from app.models.db_models import TranslationHistory

__all__ = ["TranslationHistory"]
