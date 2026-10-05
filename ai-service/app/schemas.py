"""Request/response contracts shared with the Node API and the web client."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """The rest of the stack speaks camelCase; Python stays snake_case."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Alternative(CamelModel):
    category: str
    confidence: float


class ClassifyResponse(CamelModel):
    item_name: str
    category: str
    confidence: float
    alternatives: list[Alternative]
    recommended_bin: str
    bin_color: str
    environmental_tip: str
    weight_kg: float
    co2_saved_kg: float
    points_earned: int
    model_id: str
    mode: str = Field(description="'heuristic' or 'model' — never silently a trained model")
    latency_ms: int
    disclaimer: str | None = None


class ForecastPoint(CamelModel):
    label: str
    predicted: float
    band_low: float
    band_high: float


class HistoryPoint(CamelModel):
    label: str
    value: float


class ForecastRequest(CamelModel):
    horizon_days: int = Field(default=7, ge=1, le=90)
    scope: str = Field(default="city", max_length=120)
    history: list[HistoryPoint] = Field(default_factory=list)


class ForecastResponse(CamelModel):
    horizon_days: int
    scope: str
    model: str
    mode: str
    confidence: float
    series: list[ForecastPoint]
    summary: dict
    disclaimer: str | None = None


class ModelInfo(CamelModel):
    mode: str
    model_id: str
    runtime: str
    categories: list[str]
    labels_loaded: int
    trained_model_configured: bool
    notes: str
