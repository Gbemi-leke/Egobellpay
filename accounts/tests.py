from datetime import timedelta

from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import User, VerificationCode


def make_user(**overrides):
    data = dict(email="Adaeze@Example.com", phone="0803 123 4567", password="Str0ngpass1",
                first_name="Adaeze", last_name="Nwosu")
    data.update(overrides)
    return User.objects.create_user(**data)


class UserModelTests(TestCase):
    def test_email_is_lowercased_and_phone_normalised(self):
        user = make_user()
        self.assertEqual(user.email, "adaeze@example.com")
        self.assertEqual(user.phone, "+2348031234567")
        self.assertTrue(user.check_password("Str0ngpass1"))
        self.assertEqual(len(user.referral_code), 8)
        self.assertFalse(user.is_staff)

    def test_same_phone_in_another_format_is_a_duplicate(self):
        make_user()
        with self.assertRaises(ValidationError):
            make_user(email="other@example.com", phone="+2348031234567")

    def test_duplicate_email_is_rejected_by_the_database(self):
        make_user()
        with self.assertRaises(IntegrityError), transaction.atomic():
            User(email="ADAEZE@example.com", phone="+2348090000000", first_name="A", last_name="B").save()

    def test_invalid_phone_is_rejected(self):
        with self.assertRaises(ValidationError):
            make_user(phone="12345")

    def test_blank_tag_is_stored_as_null_so_many_users_can_have_none(self):
        a = make_user()
        b = make_user(email="b@example.com", phone="08031234568")
        a.tag = ""; a.save()
        b.tag = ""; b.save()
        self.assertIsNone(User.objects.get(pk=a.pk).tag)

    def test_superuser(self):
        admin = User.objects.create_superuser(email="boss@example.com", phone="08090000001", password="Str0ngpass1",
                                              first_name="Boss", last_name="One")
        self.assertTrue(admin.is_staff and admin.is_superuser)


class PinTests(TestCase):
    def setUp(self):
        self.user = make_user()

    def test_weak_or_malformed_pins_are_refused(self):
        for bad in ["1234", "0000", "12a4", "123", "12345", ""]:
            with self.assertRaises(ValidationError, msg=bad):
                self.user.set_pin(bad)
        self.assertFalse(self.user.has_pin)

    def test_pin_is_hashed_and_checks(self):
        self.user.set_pin("4927")
        self.assertNotIn("4927", self.user.pin_hash)
        self.assertTrue(self.user.check_pin("4927"))
        self.assertFalse(self.user.check_pin("4928"))

    def test_five_wrong_pins_lock_it_even_for_the_right_pin(self):
        self.user.set_pin("4927")
        for _ in range(User.PIN_MAX_ATTEMPTS):
            self.assertFalse(self.user.check_pin("0001"))
        self.assertTrue(self.user.pin_is_locked)
        self.assertFalse(self.user.check_pin("4927"))

    def test_lock_expires_and_a_correct_pin_resets_the_counter(self):
        self.user.set_pin("4927")
        for _ in range(User.PIN_MAX_ATTEMPTS):
            self.user.check_pin("0001")
        User.objects.filter(pk=self.user.pk).update(pin_locked_until=timezone.now() - timedelta(minutes=1),
                                                    pin_failed_attempts=0)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_pin("4927"))
        self.user.check_pin("0001")
        self.assertTrue(self.user.check_pin("4927"))
        self.user.refresh_from_db()
        self.assertEqual(self.user.pin_failed_attempts, 0)


class LoginTests(TestCase):
    def setUp(self):
        self.user = make_user()

    def test_sign_in_with_email_or_any_phone_format(self):
        for identifier in ["adaeze@example.com", "ADAEZE@EXAMPLE.COM", "08031234567", "+2348031234567", "2348031234567"]:
            self.assertEqual(authenticate(username=identifier, password="Str0ngpass1"), self.user, identifier)

    def test_wrong_password_unknown_user_and_inactive_user_fail(self):
        self.assertIsNone(authenticate(username="adaeze@example.com", password="nope"))
        self.assertIsNone(authenticate(username="nobody@example.com", password="Str0ngpass1"))
        self.user.is_active = False; self.user.save()
        self.assertIsNone(authenticate(username="adaeze@example.com", password="Str0ngpass1"))


class VerificationCodeTests(TestCase):
    def setUp(self):
        self.user = make_user()

    def issue(self):
        return VerificationCode.issue(self.user, VerificationCode.Purpose.VERIFY_EMAIL, VerificationCode.Channel.EMAIL)

    def test_code_works_once(self):
        code, raw = self.issue()
        self.assertRegex(raw, r"^\d{6}$")
        self.assertNotIn(raw, code.code_hash)
        self.assertTrue(code.verify(raw))
        self.assertFalse(code.verify(raw))

    def test_new_code_cancels_the_old_one(self):
        old, old_raw = self.issue()
        new, new_raw = self.issue()
        old.refresh_from_db()
        self.assertFalse(old.verify(old_raw))
        self.assertTrue(new.verify(new_raw))

    def test_expired_code_fails(self):
        code, raw = self.issue()
        VerificationCode.objects.filter(pk=code.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
        code.refresh_from_db()
        self.assertFalse(code.verify(raw))

    def test_too_many_wrong_tries_kill_the_code(self):
        code, raw = self.issue()
        wrong = "000000" if raw != "000000" else "111111"
        for _ in range(VerificationCode.MAX_ATTEMPTS):
            self.assertFalse(code.verify(wrong))
        self.assertFalse(code.verify(raw))


class AdminTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="boss@example.com", phone="08090000001", password="Str0ngpass1",
                                                   first_name="Boss", last_name="One")
        self.client.force_login(self.admin)

    def test_admin_pages_load(self):
        user = make_user()
        for url in [reverse("admin:accounts_user_changelist"), reverse("admin:accounts_user_add"),
                    reverse("admin:accounts_user_change", args=[user.pk]),
                    reverse("admin:accounts_verificationcode_changelist")]:
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_admin_can_add_a_user(self):
        response = self.client.post(reverse("admin:accounts_user_add"), {
            "email": "New@Example.com", "phone": "0809 000 0002", "first_name": "New", "last_name": "User",
            "account_type": "personal", "usable_password": "true", "password1": "Str0ngpass1", "password2": "Str0ngpass1",
        })
        self.assertEqual(response.status_code, 302, getattr(response, "context", None) and response.context["adminform"].form.errors)
        created = User.objects.get(email="new@example.com")
        self.assertEqual(created.phone, "+2348090000002")
