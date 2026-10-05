"""Demand forecasting.

The forecaster is a transparent statistical baseline: weekday seasonality plus
an ordinary-least-squares trend fitted to the observations the caller supplies.
It refuses to run without history — inventing a curve from nothing would be a
fake prediction, which this project explicitly does not do.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

BASELINE_ID = "seasonal-naive-ols-v1"


class InsufficientHistoryError(ValueError):
    """Raised when there are not enough observations to fit anything honest."""


@dataclass
class Forecast:
    series: list[dict]
    summary: dict
    confidence: float
    model: str


def _ols(values: list[float]) -> tuple[float, float]:
    n = len(values)
    if n < 2:
        return values[0] if values else 0.0, 0.0
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    den = sum((x - mean_x) ** 2 for x in xs) or 1.0
    slope = num / den
    intercept = mean_y - slope * mean_x
    return intercept, slope


def forecast_demand(history: list[dict], horizon_days: int, scope: str) -> Forecast:
    """`history` is a list of ``{"label": "2026-09-01", "value": 1240.0}``."""
    values = [float(h["value"]) for h in history if h.get("value") is not None]
    if len(values) < 7:
        raise InsufficientHistoryError(
            f"At least 7 daily observations are required to forecast (received {len(values)}). "
            "Collect more data or keep the client in its labelled demo mode."
        )

    intercept, slope = _ols(values)

    # Weekday multipliers: mean value per weekday index relative to the mean.
    weekdays: dict[int, list[float]] = {}
    start = date.today() - timedelta(days=len(values) - 1)
    for offset, value in enumerate(values):
        weekdays.setdefault((start + timedelta(days=offset)).weekday(), []).append(value)
    overall_mean = sum(values) / len(values) or 1.0
    factors = {
        day: (sum(bucket) / len(bucket)) / overall_mean if overall_mean else 1.0
        for day, bucket in weekdays.items()
    }

    residuals = [
        value - (intercept + slope * i) * factors.get((start + timedelta(days=i)).weekday(), 1.0)
        for i, value in enumerate(values)
    ]
    spread = (sum(r * r for r in residuals) / max(len(residuals) - 1, 1)) ** 0.5

    # Confidence falls with horizon length and residual noise — no false precision.
    noise_ratio = spread / overall_mean if overall_mean else 1.0
    confidence = max(0.35, min(0.95, 0.95 - noise_ratio * 1.2 - horizon_days * 0.004))

    today = date.today()
    series: list[dict] = []
    for step in range(1, horizon_days + 1):
        day = today + timedelta(days=step)
        index = len(values) - 1 + step
        base = intercept + slope * index
        predicted = max(0.0, base * factors.get(day.weekday(), 1.0))
        widen = spread * (1 + step / max(horizon_days, 1))
        series.append(
            {
                "label": day.isoformat(),
                "predicted": round(predicted, 1),
                "bandLow": round(max(0.0, predicted - 1.28 * widen), 1),
                "bandHigh": round(predicted + 1.28 * widen, 1),
            }
        )

    recent = values[-7:]
    recent_mean = sum(recent) / len(recent)
    predicted_mean = sum(p["predicted"] for p in series) / len(series)
    change_pct = ((predicted_mean - recent_mean) / recent_mean * 100) if recent_mean else 0.0

    summary = {
        "scope": scope,
        "currentAverageKgDay": round(recent_mean, 1),
        "predictedNextWeekKgDay": round(predicted_mean, 1),
        "expectedIncreasePct": round(change_pct, 1),
        "trendPerDayKg": round(slope, 2),
        "observations": len(values),
        "residualStdDev": round(spread, 1),
        "weekdayFactors": {str(k): round(v, 3) for k, v in sorted(factors.items())},
        "method": "weekday seasonality + ordinary least squares trend",
    }

    return Forecast(series=series, summary=summary, confidence=round(confidence, 3), model=BASELINE_ID)
