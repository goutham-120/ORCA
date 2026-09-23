"""Robust JWT utility with PyJWT support and standard-library fallback."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

try:
    import jwt as _pyjwt
    HAS_PYJWT = True
except ImportError:
    _pyjwt = None  # type: ignore
    HAS_PYJWT = False


class PyJWTError(Exception):
    pass


class InvalidTokenError(PyJWTError):
    pass


class ExpiredSignatureError(InvalidTokenError):
    pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def encode(payload: dict[str, Any], key: str, algorithm: str = "HS256") -> str:
    """Encode a JWT claims payload into a compact token string."""
    if HAS_PYJWT and _pyjwt is not None:
        try:
            return _pyjwt.encode(payload, key, algorithm=algorithm)
        except Exception:
            pass

    # Built-in standard library HS256 fallback
    header = {"alg": "HS256", "typ": "JWT"}
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    header_b64 = _b64url_encode(header_bytes)
    payload_b64 = _b64url_encode(payload_bytes)
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode(token: str, key: str, algorithms: list[str] | None = None) -> dict[str, Any]:
    """Decode and verify a compact JWT token string."""
    if HAS_PYJWT and _pyjwt is not None:
        try:
            return _pyjwt.decode(token, key, algorithms=algorithms or ["HS256"])
        except _pyjwt.ExpiredSignatureError as exc:
            raise ExpiredSignatureError("Token signature has expired") from exc
        except Exception as exc:
            raise InvalidTokenError("Invalid token") from exc

    # Built-in standard library HS256 fallback
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise InvalidTokenError("Invalid token format")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise InvalidTokenError("Signature verification failed")

        payload_data = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if not isinstance(payload_data, dict):
            raise InvalidTokenError("Invalid payload")

        exp = payload_data.get("exp")
        if exp is not None and isinstance(exp, (int, float)):
            if time.time() > exp:
                raise ExpiredSignatureError("Token signature has expired")

        return payload_data
    except (ExpiredSignatureError, InvalidTokenError):
        raise
    except Exception as exc:
        raise InvalidTokenError("Token decoding failed") from exc
