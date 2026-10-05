"""Image feature extraction.

Everything here is deterministic and dependency-light: Pillow and NumPy give us
colour, edge and entropy statistics, which the heuristic classifier turns into
category scores. No network access, no hidden state.
"""

from __future__ import annotations

import io
import math
from dataclasses import dataclass, field

from .config import settings  # noqa: F401  (imported for side-effect-free config validation)

try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:  # pragma: no cover - Pillow is a hard dependency
    PIL_AVAILABLE = False

try:
    import numpy as np

    NUMPY_AVAILABLE = True
except ImportError:  # pragma: no cover - NumPy is a hard dependency
    NUMPY_AVAILABLE = False


@dataclass
class ImageFeatures:
    width: int = 0
    height: int = 0
    aspect: float = 1.0
    mean_hue: float = 0.0
    mean_saturation: float = 0.0
    mean_value: float = 0.0
    edge_density: float = 0.0
    entropy: float = 0.0
    byte_size: int = 0
    filename: str = ""
    tokens: list[str] = field(default_factory=list)
    decoded: bool = False


def filename_tokens(filename: str) -> list[str]:
    cleaned = filename.lower().replace(".", " ").replace("-", " ").replace("_", " ")
    return [t for t in cleaned.split() if len(t) > 2]


def extract_features(data: bytes, filename: str) -> ImageFeatures:
    features = ImageFeatures(byte_size=len(data), filename=filename, tokens=filename_tokens(filename))

    if not (PIL_AVAILABLE and NUMPY_AVAILABLE):
        return features

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            features.decoded = True
            features.width, features.height = img.size
            features.aspect = img.width / img.height if img.height else 1.0
            thumb = img.convert("RGB").resize((64, 64))
    except Exception:
        # Undecodable bytes still yield filename/size features.
        return features

    arr = np.asarray(thumb, dtype=np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    mx = arr.max(axis=-1)
    mn = arr.min(axis=-1)
    delta = mx - mn
    safe = np.maximum(delta, 1e-6)

    hue = np.where(
        mx == r, ((g - b) / safe) % 6, np.where(mx == g, (b - r) / safe + 2, (r - g) / safe + 4)
    ) * 60.0
    hue = np.where(delta > 0, hue, 0.0)
    saturation = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0.0)

    features.mean_hue = float(hue.mean())
    features.mean_saturation = float(saturation.mean())
    features.mean_value = float(mx.mean())

    grey = arr.mean(axis=-1)
    features.edge_density = float((np.abs(np.diff(grey, axis=1)).mean() + np.abs(np.diff(grey, axis=0)).mean()) / 2)

    hist, _ = np.histogram(grey.ravel(), bins=32, range=(0.0, 1.0))
    probs = hist / max(hist.sum(), 1)
    probs = probs[probs > 0]
    normalised = float(-(probs * np.log2(probs)).sum()) / math.log2(32) if probs.size else 0.0
    features.entropy = normalised

    del r, g, b
    return features
