import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models import F
from django.utils import timezone

from core.models import BaseModel

from .managers import UserManager
from .validators import normalize_phone, validate_phone, validate_pin_format, validate_tag

# Letters and digits that are hard to confuse when read aloud or typed (no 0/O, 1/I).
REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_referral_code():
    return "".join(secrets.choice(REFERRAL_ALPHABET) for _ in range(8))


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    The EgoBellPay user. Signs in with email (or phone, see accounts/backends.py).

    The password is for signing in. The PIN is a separate 4-digit code that
    approves every transfer and payment. Both are stored only as hashes.
    """

    class AccountType(models.TextChoices):
        PERSONAL = "personal", "Personal"
        BUSINESS = "business", "Business"

    # After this many wrong PINs in a row, the PIN is locked for PIN_LOCK_MINUTES.
    PIN_MAX_ATTEMPTS = 5
    PIN_LOCK_MINUTES = 30

    email = models.EmailField(unique=True)
    # Typed in any common format, stored as +234XXXXXXXXXX. 20 leaves room for spaces as typed.
    phone = models.CharField(max_length=20, unique=True, validators=[validate_phone])
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    date_of_birth = models.DateField(null=True, blank=True)
    account_type = models.CharField(max_length=10, choices=AccountType.choices, default=AccountType.PERSONAL)

    # Lowercase handle other users can send money to, for example "adaeze".
    tag = models.CharField(max_length=20, unique=True, null=True, blank=True, validators=[validate_tag])

    # 0 until identity is approved. Transaction limits depend on this.
    kyc_tier = models.PositiveSmallIntegerField(default=0)

    pin_hash = models.CharField(max_length=128, blank=True, editable=False)
    pin_failed_attempts = models.PositiveSmallIntegerField(default=0, editable=False)
    pin_locked_until = models.DateTimeField(null=True, blank=True, editable=False)

    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)

    referral_code = models.CharField(max_length=12, unique=True, editable=False)
    referred_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["phone", "first_name", "last_name"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    # ---- saving ---------------------------------------------------------
    def clean(self):
        super().clean()
        self.email = (self.email or "").strip().lower()
        self.phone = normalize_phone(self.phone)
        if self.tag is not None:
            self.tag = self.tag.strip().lower() or None

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        self.phone = normalize_phone(self.phone)
        if self.tag == "":
            self.tag = None
        if not self.referral_code:
            code = generate_referral_code()
            while User.objects.filter(referral_code=code).exists():
                code = generate_referral_code()
            self.referral_code = code
        super().save(*args, **kwargs)

    # ---- names ----------------------------------------------------------
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    # ---- transaction PIN ------------------------------------------------
    @property
    def has_pin(self):
        return bool(self.pin_hash)

    @property
    def pin_is_locked(self):
        return bool(self.pin_locked_until and self.pin_locked_until > timezone.now())

    def set_pin(self, raw_pin):
        """Hash and store a new PIN. Raises ValidationError if it is not acceptable."""
        validate_pin_format(raw_pin)
        self.pin_hash = make_password(raw_pin)
        self.pin_failed_attempts = 0
        self.pin_locked_until = None
        self.save(update_fields=["pin_hash", "pin_failed_attempts", "pin_locked_until", "updated_at"])

    def check_pin(self, raw_pin):
        """
        Return True if the PIN is correct.

        A wrong PIN is counted. After PIN_MAX_ATTEMPTS wrong tries in a row the
        PIN is locked for PIN_LOCK_MINUTES, and this returns False even for the
        right PIN until the lock expires.
        """
        if not self.has_pin or self.pin_is_locked:
            return False

        if check_password(raw_pin or "", self.pin_hash):
            if self.pin_failed_attempts or self.pin_locked_until:
                self.pin_failed_attempts = 0
                self.pin_locked_until = None
                self.save(update_fields=["pin_failed_attempts", "pin_locked_until", "updated_at"])
            return True

        # Count the failure in the database itself, so two wrong tries sent at
        # the same moment are both counted.
        User.objects.filter(pk=self.pk).update(pin_failed_attempts=F("pin_failed_attempts") + 1)
        self.refresh_from_db(fields=["pin_failed_attempts"])
        if self.pin_failed_attempts >= self.PIN_MAX_ATTEMPTS:
            self.pin_locked_until = timezone.now() + timedelta(minutes=self.PIN_LOCK_MINUTES)
            self.save(update_fields=["pin_locked_until", "updated_at"])
        return False


class VerificationCode(BaseModel):
    """
    A one-time code sent by email or SMS: to verify an email address or phone
    number, or to reset a password. Only a hash of the code is stored.
    """

    class Purpose(models.TextChoices):
        VERIFY_EMAIL = "verify_email", "Verify email"
        VERIFY_PHONE = "verify_phone", "Verify phone"
        RESET_PASSWORD = "reset_password", "Reset password"

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"

    MAX_ATTEMPTS = 5
    DEFAULT_TTL_MINUTES = 10

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="verification_codes")
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    code_hash = models.CharField(max_length=128)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "purpose"])]

    def __str__(self):
        return f"{self.get_purpose_display()} code for {self.user}"

    @classmethod
    def issue(cls, user, purpose, channel, ttl_minutes=DEFAULT_TTL_MINUTES):
        """
        Create a new 6-digit code and cancel any earlier unused code for the
        same purpose. Returns (verification_code, raw_code). The raw code is
        only available here, so send it to the user straight away.
        """
        now = timezone.now()
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=now)
        raw_code = f"{secrets.randbelow(1_000_000):06d}"
        obj = cls.objects.create(
            user=user,
            purpose=purpose,
            channel=channel,
            code_hash=make_password(raw_code),
            expires_at=now + timedelta(minutes=ttl_minutes),
        )
        return obj, raw_code

    @property
    def is_usable(self):
        return self.used_at is None and self.expires_at > timezone.now() and self.attempts < self.MAX_ATTEMPTS

    def verify(self, raw_code):
        """Return True and mark the code used if it matches. Wrong tries are counted."""
        if not self.is_usable:
            return False
        if check_password(raw_code or "", self.code_hash):
            self.used_at = timezone.now()
            self.save(update_fields=["used_at", "updated_at"])
            return True
        VerificationCode.objects.filter(pk=self.pk).update(attempts=F("attempts") + 1)
        self.refresh_from_db(fields=["attempts"])
        return False
