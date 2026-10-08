from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailOrPhoneBackend(ModelBackend):
    """Lets a user sign in with either their email address or their phone number."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        identifier = username or kwargs.get(User.USERNAME_FIELD) or kwargs.get("identifier")
        if not identifier or password is None:
            return None
        try:
            user = User.objects.get_by_login(identifier)
        except User.DoesNotExist:
            # Hash a password anyway so a missing account takes as long as a
            # wrong password, and timing does not reveal which emails exist.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
