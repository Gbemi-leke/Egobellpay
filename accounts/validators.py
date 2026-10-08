import re

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

# Nigerian mobile numbers, stored as +234 followed by 10 digits.
PHONE_RE = re.compile(r"^\+234[789][01]\d{8}$")


validate_tag = RegexValidator(
    regex=r"^[a-z0-9_]{3,20}$",
    message="A tag is 3 to 20 characters: lowercase letters, numbers and underscores.",
)


def normalize_phone(value):
    """
    Turn 0803 123 4567, 2348031234567 or +2348031234567 into +2348031234567.
    Returns the cleaned input unchanged if it is not a recognisable number,
    so validate_phone can reject it with a clear message.
    """
    digits = re.sub(r"[\s\-()]", "", value or "")
    if digits.startswith("+234"):
        return digits
    if digits.startswith("234") and len(digits) == 13:
        return "+" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "+234" + digits[1:]
    return digits


def validate_phone(value):
    """
    Accept a Nigerian mobile number in any common format (0803..., 234803...,
    +234803..., with or without spaces). The model stores it as +234XXXXXXXXXX.
    """
    if not PHONE_RE.match(normalize_phone(value)):
        raise ValidationError("Enter a Nigerian mobile number, like 0803 123 4567.")


def validate_pin_format(raw_pin):
    """A PIN is exactly 4 digits and not trivially guessable."""
    if not re.fullmatch(r"\d{4}", raw_pin or ""):
        raise ValidationError("A PIN is exactly 4 digits.")
    if len(set(raw_pin)) == 1 or raw_pin in {"1234", "4321"}:
        raise ValidationError("That PIN is too easy to guess. Choose another.")
