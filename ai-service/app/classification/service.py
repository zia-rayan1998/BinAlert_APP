"""Waste classification.

Two honest modes:

* ``heuristic`` (default) — deterministic rules over colour, edge and entropy
  features plus filename tokens. It is *not* a trained network and every
  response says so via ``mode`` and ``disclaimer``.
* ``model`` — loads an exported ONNX or TorchScript checkpoint from
  ``AI_MODEL_PATH``. If the checkpoint or its runtime is missing the request
  fails with a clear error instead of quietly falling back to the heuristic.
"""

from __future__ import annotations

import io
import math
import time
from dataclasses import dataclass

from ..config import settings
from ..preprocessing import ImageFeatures, extract_features, filename_tokens
from ..taxonomy import CATEGORIES, TYPICAL_WEIGHT_KG

HEURISTIC_ID = "binalert-heuristic-v1"

KEYWORD_HINTS: dict[str, tuple[str, ...]] = {
    "plastic": ("bottle", "plastic", "pet", "container", "tub", "wrapper", "bag", "jug"),
    "paper": ("paper", "card", "cardboard", "box", "newspaper", "magazine", "carton", "receipt"),
    "glass": ("glass", "jar", "vial", "flask"),
    "metal": ("can", "metal", "aluminium", "aluminum", "tin", "foil", "steel"),
    "organic": ("food", "organic", "fruit", "vegetable", "compost", "banana", "apple", "scraps", "peel"),
    "e-waste": ("phone", "laptop", "battery", "cable", "charger", "circuit", "monitor", "ewaste", "device"),
    "mixed": ("mixed", "trash", "garbage", "waste"),
}

HEURISTIC_DISCLAIMER = (
    "No trained model is loaded. This result comes from a deterministic image-feature heuristic "
    "and should be treated as an estimate, not a model prediction."
)

_model_cache: dict[str, tuple[str, object]] = {}


class ModelUnavailableError(RuntimeError):
    """Raised when model mode is configured but cannot actually run."""


@dataclass
class Classification:
    item_name: str
    category: str
    confidence: float
    alternatives: list[tuple[str, float]]
    weight_kg: float
    co2_saved_kg: float
    points_earned: int
    mode: str
    model_id: str
    latency_ms: int
    disclaimer: str | None


def _softmax(scores: dict[str, float]) -> dict[str, float]:
    peak = max(scores.values(), default=0.0)
    exps = {k: math.exp((v - peak) * 3.0) for k, v in scores.items()}
    total = sum(exps.values()) or 1.0
    return {k: v / total for k, v in exps.items()}


def _hue_band(hue: float) -> str:
    if hue < 15 or hue >= 345:
        return "red"
    if hue < 45:
        return "orange"
    if hue < 70:
        return "yellow"
    if hue < 160:
        return "green"
    if hue < 200:
        return "teal"
    if hue < 255:
        return "blue"
    if hue < 290:
        return "indigo"
    return "purple"


def _heuristic_scores(f: ImageFeatures) -> dict[str, float]:
    scores = {key: 0.0 for key in CATEGORIES}

    for key, words in KEYWORD_HINTS.items():
        hits = sum(1 for token in f.tokens if token in words)
        if hits:
            scores[key] += 1.6 * hits

    if f.decoded:
        band = _hue_band(f.mean_hue)
        if band in ("green", "yellow") and f.mean_saturation > 0.25:
            scores["organic"] += 1.1
        if band in ("blue", "teal"):
            scores["plastic"] += 0.9
        if band in ("orange", "red") and f.mean_saturation > 0.3:
            scores["glass"] += 0.7
        if f.mean_saturation < 0.12 and f.mean_value > 0.55:
            scores["paper"] += 1.0
        if f.mean_saturation < 0.15 and f.edge_density > 0.06:
            scores["metal"] += 0.9
        if f.edge_density > 0.12 and f.entropy > 0.72:
            scores["e-waste"] += 1.2
        if f.edge_density > 0.09 and f.entropy > 0.66:
            scores["mixed"] += 0.5

    # Very small payloads are rarely real photographs; nudge toward "other".
    if f.byte_size < 8_000:
        scores["other"] += 0.6
    if not f.decoded:
        scores["other"] += 1.0

    if max(scores.values()) <= 0:
        scores["mixed"] = 1.0

    return _softmax(scores)


def _item_name(category: str, tokens: list[str]) -> str:
    if tokens:
        return " ".join(tokens[:3]).capitalize()
    return f"{CATEGORIES[category].label} item"


def _load_model() -> tuple[str, object]:
    path = settings.ai_model_path
    cached = _model_cache.get(path)
    if cached is not None:
        return cached

    suffix = path.lower().rsplit(".", 1)[-1] if "." in path else ""
    try:
        if suffix == "onnx":
            import onnxruntime as ort  # type: ignore

            loaded: tuple[str, object] = ("onnx", ort.InferenceSession(path, providers=["CPUExecutionProvider"]))
        elif suffix in ("pt", "pth"):
            import torch  # type: ignore

            loaded = ("torch", torch.jit.load(path, map_location="cpu"))
        else:
            raise ModelUnavailableError(
                f"Unsupported model file '.{suffix}'. Export to .onnx or TorchScript .pt, "
                "or set AI_MODEL_MODE=heuristic."
            )
    except ImportError as err:
        raise ModelUnavailableError(
            f"AI_MODEL_MODE=model but the runtime for '.{suffix}' is not installed ({err}). "
            "Install onnxruntime or torch, or set AI_MODEL_MODE=heuristic."
        ) from err
    except ModelUnavailableError:
        raise
    except Exception as err:  # noqa: BLE001
        raise ModelUnavailableError(f"Could not load model at '{path}': {err}") from err

    _model_cache[path] = loaded
    return loaded


def _to_tensor(data: bytes, size: tuple[int, int]):
    import numpy as np
    from PIL import Image

    with Image.open(io.BytesIO(data)) as img:
        resized = img.convert("RGB").resize(size)
    arr = np.asarray(resized, dtype=np.float32) / 255.0
    return arr.transpose(2, 0, 1)[None, ...]


def _model_predict(data: bytes) -> tuple[str, float, list[tuple[str, float]], str]:
    runtime, model = _load_model()
    keys = list(CATEGORIES.keys())

    if runtime == "onnx":
        meta = model.get_inputs()[0]  # type: ignore[attr-defined]
        dims = [d if isinstance(d, int) and d > 0 else 224 for d in meta.shape]
        size = (dims[-1], dims[-2])
        outputs = model.run(None, {meta.name: _to_tensor(data, size)})[0][0]  # type: ignore[attr-defined]
        model_id = f"onnx:{settings.ai_model_path.rsplit('/', 1)[-1].rsplit(chr(92), 1)[-1]}"
    else:
        import torch

        with torch.no_grad():
            outputs = model(torch.from_numpy(_to_tensor(data, (224, 224))))[0].numpy()  # type: ignore[operator]
        model_id = f"torchscript:{settings.ai_model_path.rsplit('/', 1)[-1].rsplit(chr(92), 1)[-1]}"

    logits = [float(v) for v in outputs][: len(keys)]
    logits += [0.0] * max(0, len(keys) - len(logits))

    ranked = sorted(_softmax(dict(zip(keys, logits))).items(), key=lambda kv: kv[1], reverse=True)
    top, top_prob = ranked[0]
    return top, top_prob, ranked[1:4], model_id


def classify_image(data: bytes, filename: str) -> Classification:
    started = time.perf_counter()
    tokens = filename_tokens(filename)

    if settings.uses_model:
        category, confidence, alternatives, model_id = _model_predict(data)
        mode, disclaimer = "model", None
    else:
        features = extract_features(data, filename)
        ranked = sorted(_heuristic_scores(features).items(), key=lambda kv: kv[1], reverse=True)
        category, confidence = ranked[0]
        alternatives = ranked[1:4]
        mode, model_id, disclaimer = "heuristic", HEURISTIC_ID, HEURISTIC_DISCLAIMER

    info = CATEGORIES[category]
    weight_kg = TYPICAL_WEIGHT_KG.get(category, 0.4)

    return Classification(
        item_name=_item_name(category, tokens),
        category=category,
        confidence=round(min(0.99, confidence), 3),
        alternatives=[(k, round(v, 3)) for k, v in alternatives],
        weight_kg=round(weight_kg, 3),
        co2_saved_kg=round(weight_kg * info.co2_factor, 2),
        points_earned=info.points,
        mode=mode,
        model_id=model_id,
        latency_ms=int((time.perf_counter() - started) * 1000),
        disclaimer=disclaimer,
    )
