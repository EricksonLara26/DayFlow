"""Logging filters that keep credentials and tokens out of output."""

import logging
import re


SENSITIVE_PATTERNS = (
    re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*"),
    re.compile(
        r"(?i)\b(password|token|secret|authorization|cookie|db_password)"
        r"(\s*[=:]\s*)([^\s,;]+)"
    ),
    re.compile(r"(?P<path>/[^\s?\"']+)\?[^\s\"']+"),
)


def redact_sensitive_text(value):
    redacted = str(value)
    redacted = SENSITIVE_PATTERNS[0].sub("Bearer [REDACTED]", redacted)
    redacted = SENSITIVE_PATTERNS[1].sub(
        lambda match: f"{match.group(1)}{match.group(2)}[REDACTED]",
        redacted,
    )
    redacted = SENSITIVE_PATTERNS[2].sub(
        r"\g<path>?[REDACTED_QUERY]",
        redacted,
    )
    return redacted


class RedactSensitiveDataFilter(logging.Filter):
    """Redact likely credentials while preserving useful log context."""

    def filter(self, record):
        record.request_id = getattr(record, "request_id", "-")
        record.msg = redact_sensitive_text(record.getMessage())
        record.args = ()
        return True
