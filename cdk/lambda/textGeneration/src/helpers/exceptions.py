"""
Custom exception classes for the TextGeneration Lambda.
"""

class TextGenerationError(Exception):
    """Base class for all application exceptions."""
    def __init__(self, message, status_code=500, error_code="INTERNAL_ERROR", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}

class ValidationError(TextGenerationError):
    """Raised when input validation fails (400)."""
    def __init__(self, message, details=None):
        super().__init__(
            message=message, 
            status_code=400, 
            error_code="VALIDATION_ERROR", 
            details=details
        )

class ConfigurationError(TextGenerationError):
    """Raised when required configuration or resources are missing (500)."""
    def __init__(self, message):
        super().__init__(
            message=message, 
            status_code=500, 
            error_code="CONFIGURATION_ERROR"
        )

class TokenLimitError(TextGenerationError):
    """Raised when a user exceeds their daily token limit (429)."""
    def __init__(self, message, usage_info=None):
        super().__init__(
            message=message, 
            status_code=429, 
            error_code="TOKEN_LIMIT_EXCEEDED",
            details={"usage_info": usage_info}
        )

class UpstreamServiceError(TextGenerationError):
    """Raised when an external service (Bedrock, DB) fails (502)."""
    def __init__(self, message, service_name):
        super().__init__(
            message=f"Error communicating with {service_name}: {message}", 
            status_code=502, 
            error_code="UPSTREAM_SERVICE_ERROR",
            details={"service": service_name}
        )
