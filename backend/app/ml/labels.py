from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class DevelopmentLabel:
    label: str
    severity: str
    advisory: str


DEVELOPMENT_LABELS: tuple[DevelopmentLabel, ...] = (
    DevelopmentLabel(
        label="healthy",
        severity="low",
        advisory=(
            "No simulated disease pattern was selected. Continue routine scouting, "
            "avoid unnecessary pesticide use, and re-check the crop if symptoms appear."
        ),
    ),
    DevelopmentLabel(
        label="fungal_leaf_spot",
        severity="moderate",
        advisory=(
            "Development simulation only: inspect nearby plants for expanding spots, "
            "avoid overhead irrigation when practical, improve airflow, and seek local "
            "agronomic confirmation before applying fungicides."
        ),
    ),
    DevelopmentLabel(
        label="bacterial_leaf_spot",
        severity="moderate",
        advisory=(
            "Development simulation only: isolate visibly affected material where practical, "
            "avoid handling wet foliage, sanitize tools, and seek expert confirmation before treatment."
        ),
    ),
    DevelopmentLabel(
        label="pest_damage",
        severity="moderate",
        advisory=(
            "Development simulation only: inspect leaf undersides and nearby plants for insects, "
            "record pest counts, and use integrated pest-management guidance before applying pesticides."
        ),
    ),
)