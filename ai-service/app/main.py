"""BinAlert AI inference service — FastAPI entry point.

Run locally:
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .classification.service import (
    HEURISTIC_DISCLAIMER,
    HEURISTIC_ID,
    ModelUnavailableError,
    classify_image,
)
from .config import settings
from .forecasting.service import BASELINE_ID, InsufficientHistoryError, forecast_demand
from .schemas import (
    Alternative,
    ClassifyResponse,
    ForecastRequest,
    ForecastResponse,
    ModelInfo,
)
from .taxonomy import CATEGORIES

logging.basicConfig(level=settings.ai_log_level.upper())
log = logging.getLogger("binalert.ai")

app = FastAPI(
    title="BinAlert AI Service",
    version="1.0.0",
    description="Waste classification and demand forecasting for BinAlert. Reports its own mode honestly.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "binalert-ai",
        "mode": settings.ai_model_mode,
        "model_configured": settings.uses_model,
        "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }


@app.get("/api/ai/model-info", response_model=ModelInfo, response_model_by_alias=True)
def model_info() -> ModelInfo:
    using_model = settings.uses_model
    labels: list[str] = []
    if settings.ai_labels_path:
        try:
            with open(settings.ai_labels_path, encoding="utf-8") as fh:
                labels = [line.strip() for line in fh if line.strip()]
        except OSError as err:
            log.warning("Could not read AI_LABELS_PATH: %s", err)

    return ModelInfo(
        mode=settings.ai_model_mode,
        model_id=HEURISTIC_ID if not using_model else settings.ai_model_path,
        runtime="none" if not using_model else ("onnxruntime" if settings.ai_model_path.endswith(".onnx") else "torch"),
        categories=list(CATEGORIES.keys()),
        labels_loaded=len(labels),
        trained_model_configured=using_model,
        notes=HEURISTIC_DISCLAIMER if not using_model else "Live checkpoint configured via AI_MODEL_PATH.",
    )


@app.post("/api/ai/classify", response_model=ClassifyResponse, response_model_by_alias=True)
async def classify(image: UploadFile = File(...)) -> ClassifyResponse:
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, f"Unsupported content type '{image.content_type}'. Send png, jpeg or webp.")

    data = await image.read()
    if not data:
        raise HTTPException(400, "The uploaded image is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(400, f"Image exceeds the {settings.ai_max_upload_mb} MB limit.")

    try:
        result = classify_image(data, image.filename or "upload.jpg")
    except ModelUnavailableError as err:
        # Model mode was requested but cannot run — say so instead of guessing.
        raise HTTPException(503, str(err)) from err
    except Exception as err:  # noqa: BLE001
        log.exception("Classification failed")
        raise HTTPException(500, f"Classification failed: {err}") from err

    info = CATEGORIES[result.category]
    return ClassifyResponse(
        item_name=result.item_name,
        category=result.category,
        confidence=result.confidence,
        alternatives=[Alternative(category=c, confidence=v) for c, v in result.alternatives],
        recommended_bin=info.recommended_bin,
        bin_color=info.bin_color,
        environmental_tip=info.tip,
        weight_kg=result.weight_kg,
        co2_saved_kg=result.co2_saved_kg,
        points_earned=result.points_earned,
        model_id=result.model_id,
        mode=result.mode,
        latency_ms=result.latency_ms,
        disclaimer=result.disclaimer,
    )


@app.post("/api/ai/forecast", response_model=ForecastResponse, response_model_by_alias=True)
def forecast(payload: ForecastRequest) -> ForecastResponse:
    history = [{"label": p.label, "value": p.value} for p in payload.history]
    try:
        result = forecast_demand(history, payload.horizon_days, payload.scope)
    except InsufficientHistoryError as err:
        raise HTTPException(422, str(err)) from err

    return ForecastResponse(
        horizon_days=payload.horizon_days,
        scope=payload.scope,
        model=result.model,
        mode="baseline",
        confidence=result.confidence,
        series=result.series,  # type: ignore[arg-type]
        summary=result.summary,
        disclaimer=(
            f"Statistical baseline ({BASELINE_ID}) fitted to {len(history)} supplied observations. "
            "This is not a machine-learning model and carries no claim beyond that fit."
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.ai_host, port=settings.ai_port, reload=True)
