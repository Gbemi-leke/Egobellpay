from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError

from .models import User
from .throttle import LoginThrottle


class UserAdminCreationForm(AdminUserCreationForm):
    """The "Add user" form in the Django admin."""

    class Meta:
        model = User
        fields = ("email", "phone", "first_name", "last_name", "account_type")


class UserAdminChangeForm(UserChangeForm):
    """The "Change user" form in the Django admin."""

    class Meta:
        model = User
        fields = "__all__"


def _account_key(identifier):
    """
    One key per account, however it is typed. An email and every format of the
    phone number all count against the same limit.
    """
    try:
        return f"user:{User.objects.get_by_login(identifier).pk}"
    except User.DoesNotExist:
        return f"unknown:{identifier.strip().lower()}"


class LoginForm(forms.Form):
    """
    The sign-in form. After is_valid() returns True, form.user is the signed-in user.

    The error is the same whether the account does not exist, the password is
    wrong or the account is switched off, so the page never reveals which
    emails and phone numbers are registered.
    """

    INVALID = "That email, phone number or password is incorrect."
    LOCKED = "Too many attempts. Wait 15 minutes, then try again."

    identifier = forms.CharField(max_length=254, error_messages={"required": "Enter your email or phone number."})
    password = forms.CharField(strip=False, error_messages={"required": "Enter your password."})
    remember = forms.BooleanField(required=False)

    def __init__(self, data=None, *, request=None, **kwargs):
        super().__init__(data, **kwargs)
        self.request = request
        self.user = None

    def clean(self):
        cleaned = super().clean()
        identifier = cleaned.get("identifier")
        password = cleaned.get("password")
        if not identifier or not password:
            return cleaned

        throttle = LoginThrottle(self.request, _account_key(identifier))
        if throttle.is_blocked:
            raise ValidationError(self.LOCKED, code="locked")

        user = authenticate(self.request, username=identifier, password=password)
        if user is None:
            throttle.record_failure()
            if throttle.is_blocked:
                raise ValidationError(self.LOCKED, code="locked")
            raise ValidationError(self.INVALID, code="invalid")

        throttle.reset()
        self.user = user
        return cleaned

    @property
    def first_error(self):
        """The one message to show above the button, or an empty string."""
        for errors in (self.non_field_errors(), *self.errors.values()):
            if errors:
                return errors[0]
        return ""
