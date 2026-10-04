class CropGuardError(Exception):
    """Base application exception."""


class ConflictError(CropGuardError):
    pass


class AuthenticationError(CropGuardError):
    pass


class AuthorizationError(CropGuardError):
    pass


class NotFoundError(CropGuardError):
    pass
