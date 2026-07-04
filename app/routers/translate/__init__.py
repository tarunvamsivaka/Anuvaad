from fastapi import APIRouter

from .code_to_code import router as code_to_code_router
from .code_to_english import router as code_to_english_router
from .english_to_code import router as english_to_code_router
from .upload import router as upload_router

router = APIRouter(prefix="", tags=["translate"])

router.include_router(upload_router)
router.include_router(code_to_english_router)
router.include_router(english_to_code_router)
router.include_router(code_to_code_router)
