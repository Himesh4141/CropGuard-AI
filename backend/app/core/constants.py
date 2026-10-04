from enum import StrEnum


class UserRole(StrEnum):
    FARMER = "farmer"
    EXTENSION_OFFICER = "extension_officer"
    ADMIN = "admin"


class DiagnosisStatus(StrEnum):
    UPLOADED = "uploaded"
    ANALYZED = "analyzed"
    FAILED = "failed"
