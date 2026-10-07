from enum import StrEnum


class UserRole(StrEnum):
    FARMER = "farmer"
    EXTENSION_OFFICER = "extension_officer"
    ADMIN = "admin"


class DiagnosisStatus(StrEnum):
    UPLOADED = "uploaded"
    ANALYZED = "analyzed"
    FAILED = "failed"


class CareCaseStatus(StrEnum):
    OPEN = "open"
    MONITORING = "monitoring"
    ESCALATED = "escalated"
    RESOLVED = "resolved"


class CareCaseTrend(StrEnum):
    NEW = "new"
    IMPROVING = "improving"
    SAME = "same"
    WORSENING = "worsening"


class CareCasePriority(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class CareCaseEventType(StrEnum):
    SYSTEM = "system"
    FARMER_UPDATE = "farmer_update"
    OFFICER_GUIDANCE = "officer_guidance"
    STATUS_CHANGE = "status_change"
