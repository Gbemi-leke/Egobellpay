from django.contrib.auth.base_user import BaseUserManager

from .validators import normalize_phone


class UserManager(BaseUserManager):
    """Creates users that sign in with an email address instead of a username."""

    use_in_migrations = True

    def _create_user(self, email, phone, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        if not phone:
            raise ValueError("A phone number is required.")
        user = self.model(
            email=self.normalize_email(email).lower(),
            phone=normalize_phone(phone),
            **extra_fields,
        )
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_user(self, email, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, phone, password, **extra_fields)

    def create_superuser(self, email, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")
        return self._create_user(email, phone, password, **extra_fields)

    def get_by_login(self, identifier):
        """Find a user by email or phone number. Raises User.DoesNotExist."""
        identifier = (identifier or "").strip()
        if "@" in identifier:
            return self.get(email=identifier.lower())
        return self.get(phone=normalize_phone(identifier))
