from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm

from .models import User


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
