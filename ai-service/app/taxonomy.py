"""Waste taxonomy shared by the classifier and the API contract."""

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryInfo:
    key: str
    label: str
    recommended_bin: str
    bin_color: str
    tip: str
    points: int
    co2_factor: float  # kg CO2e avoided per kg diverted


CATEGORIES: dict[str, CategoryInfo] = {
    "plastic": CategoryInfo("plastic", "Plastic", "Blue recycling bin", "#2563eb",
                            "Rinse containers and keep caps on — loose caps fall through sorting screens.", 25, 2.3),
    "paper": CategoryInfo("paper", "Paper & Card", "Blue recycling bin", "#0ea5e9",
                          "Keep paper dry and flatten cardboard to save collection space.", 25, 1.4),
    "glass": CategoryInfo("glass", "Glass", "Green recycling bin", "#16a34a",
                          "Glass can be recycled endlessly without losing quality.", 25, 1.2),
    "metal": CategoryInfo("metal", "Metal", "Green recycling bin", "#64748b",
                          "Recycling aluminium saves about 95% of the energy of making it from ore.", 25, 6.8),
    "organic": CategoryInfo("organic", "Organic", "Brown compost bin", "#a16207",
                            "Composting food waste avoids methane from landfill.", 20, 1.2),
    "e-waste": CategoryInfo("e-waste", "E-Waste", "Specialist e-waste point", "#7c3aed",
                            "Never bin batteries or devices — they leak heavy metals and can start fires.", 40, 16.0),
    "mixed": CategoryInfo("mixed", "Mixed waste", "Grey general waste bin", "#475569",
                          "Mixed bags are hard to recycle — separating at home doubles recovery rates.", 10, 0.4),
    "other": CategoryInfo("other", "Other", "Grey general waste bin", "#94a3b8",
                          "When unsure, check the item label or ask at your nearest recycling point.", 10, 0.3),
}

CATEGORY_KEYS = list(CATEGORIES.keys())

# Rough typical mass per item, used to turn a classification into a weight.
TYPICAL_WEIGHT_KG = {
    "plastic": 0.03,
    "paper": 0.25,
    "glass": 0.35,
    "metal": 0.04,
    "organic": 0.55,
    "e-waste": 0.30,
    "mixed": 0.80,
    "other": 0.40,
}
