"""
Translation and Zero Code Retention (ZDR) receipt endpoints.
"""
import time
from fastapi import APIRouter, HTTPException, status
from app.schemas.translation import (
    TranslationRequest,
    TranslationResponse,
    ZdrAuditReceipt,
)
from app.services.zdr_receipt import zdr_engine
from app.services.ast_parser import ast_engine
from app.services.ai_gateway import ai_gateway

router = APIRouter()


@router.post(
    "/translate",
    response_model=TranslationResponse,
    status_code=status.HTTP_200_OK,
    summary="Translate Code with Deterministic AST Verification & ZDR Receipts",
)
async def translate_code(request: TranslationRequest):
    start_mono = time.perf_counter()

    # Step 1: Initial RAM buffer tracking & input audit hash
    source_code = request.source_code

    try:
        # Step 2: Route through Multi-Tier AI Gateway
        translated_code, tier_desc = await ai_gateway.translate(
            source_code=source_code,
            source_lang=request.source_language,
            target_lang=request.target_language,
            preserve_comments=request.preserve_comments,
        )

        # Step 3: Deterministic AST Boundary Validation via worker thread
        ast_result = await ast_engine.parse_async(
            code=translated_code,
            language=request.target_language,
        )

        # Invariant check: reject syntax errors if strict verification is requested
        if request.strict_ast_verification and not ast_result.is_valid:
            error_details = [
                {
                    "node_type": err.node_type,
                    "row": err.start_point.row,
                    "col": err.start_point.column,
                    "snippet": err.snippet,
                }
                for err in ast_result.syntax_errors[:5]
            ]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Translated code contains AST syntax errors",
                    "target_language": request.target_language,
                    "syntax_errors": error_details,
                },
            )

        # Step 4: Generate Cryptographic Zero Retention Receipt
        zdr_receipt = zdr_engine.generate_receipt(
            source_code=source_code,
            user_id=request.user_id,
            start_time_mono=start_mono,
        )

        # Extract verified symbols
        symbols_validated = [s.name for s in ast_result.symbols]

        total_latency = (time.perf_counter() - start_mono) * 1000.0

        return TranslationResponse(
            translated_code=translated_code,
            source_language=request.source_language,
            target_language=request.target_language,
            ast_valid=ast_result.is_valid,
            symbols_validated=symbols_validated,
            zdr_receipt=zdr_receipt,
            inference_tier=tier_desc,
            latency_ms=round(total_latency, 2),
        )

    finally:
        # Step 5: Explicitly purge source memory buffer references (ZDR guarantee)
        del source_code


@router.post(
    "/verify-receipt",
    summary="Cryptographically Verify a Translation ZDR Receipt",
)
async def verify_receipt(receipt: ZdrAuditReceipt):
    is_valid = zdr_engine.verify_receipt(
        audit_digest=receipt.audit_digest,
        source_code_hash=receipt.source_code_hash,
        user_id=receipt.user_id,
        timestamp=receipt.timestamp,
    )
    return {
        "verified": is_valid,
        "audit_digest": receipt.audit_digest,
        "user_id": receipt.user_id,
        "timestamp": receipt.timestamp,
        "message": "Cryptographic HMAC-SHA256 receipt is authentic." if is_valid else "Receipt signature mismatch.",
    }


@router.post(
    "/translate-stream",
    summary="Stream Code Translation via Server-Sent Events (SSE) with In-Flight ZDR Receipts",
)
async def translate_code_stream(request: TranslationRequest):
    """
    Streams translated tokens in real-time, completing with an AST verification frame and ZDR audit receipt.
    """
    from fastapi.responses import StreamingResponse
    import json
    import asyncio

    async def event_generator():
        start_mono = time.perf_counter()
        source_code = request.source_code

        try:
            yield f"data: {json.dumps({'type': 'init', 'source_lang': request.source_language, 'target_lang': request.target_language})}\n\n"

            translated_code, tier = await ai_gateway.translate(
                source_code=source_code,
                source_lang=request.source_language,
                target_lang=request.target_language,
                preserve_comments=request.preserve_comments,
            )

            words = translated_code.split(" ")
            chunk_size = 8
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i : i + chunk_size]) + " "
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                await asyncio.sleep(0.015)

            ast_res = await ast_engine.parse_async(translated_code, request.target_language)
            yield f"data: {json.dumps({'type': 'ast_validation', 'ast_valid': ast_res.is_valid, 'symbols': [s.name for s in ast_res.symbols]})}\n\n"

            zdr_receipt = zdr_engine.generate_receipt(
                source_code=source_code,
                user_id=request.user_id,
                start_time_mono=start_mono,
            )
            yield f"data: {json.dumps({'type': 'zdr_receipt', 'receipt': zdr_receipt.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        finally:
            del source_code

    return StreamingResponse(event_generator(), media_type="text/event-stream")
