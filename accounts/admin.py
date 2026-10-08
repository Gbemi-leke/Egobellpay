from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .forms import UserAdminChangeForm, UserAdminCreationForm
from .models import User, VerificationCode


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm

    ordering = ("-created_at",)
    list_display = ("email", "phone", "first_name", "last_name", "account_type", "kyc_tier", "is_active", "is_staff")
    list_filter = ("account_type", "kyc_tier", "is_active", "is_staff")
    search_fields = ("email", "phone", "first_name", "last_name", "tag", "referral_code")
    readonly_fields = ("referral_code", "pin_status", "last_login", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("email", "phone", "password")}),
        ("Personal details", {"fields": ("first_name", "last_name", "date_of_birth", "account_type", "tag")}),
        ("Verification", {"fields": ("kyc_tier", "email_verified_at", "phone_verified_at", "pin_status")}),
        ("Referrals", {"fields": ("referral_code", "referred_by")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "phone", "first_name", "last_name", "account_type", "usable_password", "password1", "password2"),
        }),
    )
    raw_id_fields = ("referred_by",)

    @admin.display(description="Transaction PIN")
    def pin_status(self, obj):
        # The PIN hash itself is never shown, even to staff.
        if not obj.has_pin:
            return "Not set"
        return "Locked" if obj.pin_is_locked else "Set"


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "channel", "attempts", "expires_at", "used_at", "created_at")
    list_filter = ("purpose", "channel")
    search_fields = ("user__email", "user__phone")
    raw_id_fields = ("user",)
    # The stored hash is not useful to staff and is left out on purpose.
    exclude = ("code_hash",)
    readonly_fields = ("user", "purpose", "channel", "attempts", "expires_at", "used_at", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False
