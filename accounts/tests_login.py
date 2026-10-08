from django.conf import settings
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse

from .forms import LoginForm
from .models import User
from .throttle import MAX_FAILURES_PER_ACCOUNT

PASSWORD = "Str0ngpass1"


class LoginTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="adaeze@example.com", phone="0803 123 4567", password=PASSWORD,
            first_name="Adaeze", last_name="Nwosu",
        )

    def setUp(self):
        cache.clear()
        self.url = reverse("frontend:login")
        self.dashboard = reverse("frontend:dashboard")

    def sign_in(self, identifier="adaeze@example.com", password=PASSWORD, **extra):
        return self.client.post(self.url, {"identifier": identifier, "password": password, **extra})

    def signed_in(self):
        return "_auth_user_id" in self.client.session


class SignInTests(LoginTestCase):
    def test_page_loads_with_a_csrf_token(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "csrfmiddlewaretoken")
        self.assertContains(response, 'name="identifier"')

    def test_sign_in_with_email_or_any_phone_format(self):
        for identifier in ["adaeze@example.com", " ADAEZE@Example.com ", "08031234567", "0803 123 4567", "+2348031234567"]:
            self.client.logout()
            response = self.sign_in(identifier)
            self.assertRedirects(response, self.dashboard, msg_prefix=identifier)
            self.assertTrue(self.signed_in(), identifier)

    def test_wrong_password_unknown_account_and_inactive_account_look_the_same(self):
        inactive = User.objects.create_user(email="off@example.com", phone="08090000009", password=PASSWORD,
                                            first_name="Off", last_name="User", is_active=False)
        for identifier, password in [("adaeze@example.com", "wrong"), ("nobody@example.com", PASSWORD), (inactive.email, PASSWORD)]:
            response = self.sign_in(identifier, password)
            self.assertEqual(response.status_code, 200)
            self.assertContains(response, LoginForm.INVALID)
            self.assertFalse(self.signed_in())

    def test_failed_sign_in_keeps_the_identifier_but_never_the_password(self):
        response = self.sign_in("adaeze@example.com", "wrong-secret")
        self.assertContains(response, 'value="adaeze@example.com"')
        self.assertNotContains(response, "wrong-secret")

    def test_empty_form_shows_a_message(self):
        response = self.client.post(self.url, {"identifier": "", "password": ""})
        self.assertContains(response, "Enter your email or phone number.")

    def test_csrf_token_is_required(self):
        strict = Client(enforce_csrf_checks=True)
        response = strict.post(self.url, {"identifier": "adaeze@example.com", "password": PASSWORD})
        self.assertEqual(response.status_code, 403)

    def test_already_signed_in_user_is_sent_to_the_dashboard(self):
        self.client.force_login(self.user)
        self.assertRedirects(self.client.get(self.url), self.dashboard)


class LockoutTests(LoginTestCase):
    def test_account_locks_after_too_many_wrong_passwords(self):
        for _ in range(MAX_FAILURES_PER_ACCOUNT - 1):
            self.assertContains(self.sign_in(password="wrong"), LoginForm.INVALID)
        self.assertContains(self.sign_in(password="wrong"), LoginForm.LOCKED)
        # Even the right password is refused while locked
        self.assertContains(self.sign_in(), LoginForm.LOCKED)
        self.assertFalse(self.signed_in())

    def test_email_and_phone_count_against_the_same_limit(self):
        identifiers = ["adaeze@example.com", "08031234567", "+2348031234567", "ADAEZE@example.com", "0803 123 4567"]
        for identifier in identifiers[:MAX_FAILURES_PER_ACCOUNT]:
            self.sign_in(identifier, "wrong")
        self.assertContains(self.sign_in(), LoginForm.LOCKED)

    def test_unknown_accounts_are_limited_too(self):
        for _ in range(MAX_FAILURES_PER_ACCOUNT):
            self.sign_in("nobody@example.com", "wrong")
        self.assertContains(self.sign_in("nobody@example.com", "wrong"), LoginForm.LOCKED)

    def test_one_locked_account_does_not_lock_another(self):
        other = User.objects.create_user(email="tunde@example.com", phone="08090000008", password=PASSWORD,
                                         first_name="Tunde", last_name="Bakare")
        for _ in range(MAX_FAILURES_PER_ACCOUNT):
            self.sign_in(password="wrong")
        self.assertRedirects(self.sign_in(other.email), self.dashboard)

    def test_successful_sign_in_clears_the_count(self):
        for _ in range(MAX_FAILURES_PER_ACCOUNT - 1):
            self.sign_in(password="wrong")
        self.assertRedirects(self.sign_in(), self.dashboard)
        self.client.logout()
        for _ in range(MAX_FAILURES_PER_ACCOUNT - 1):
            self.assertContains(self.sign_in(password="wrong"), LoginForm.INVALID)


class SessionTests(LoginTestCase):
    def test_without_keep_me_signed_in_the_session_ends_with_the_browser(self):
        self.sign_in()
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_keep_me_signed_in_lasts_for_the_configured_time(self):
        self.sign_in(remember="on")
        self.assertFalse(self.client.session.get_expire_at_browser_close())
        self.assertEqual(self.client.session.get_expiry_age(), settings.SESSION_COOKIE_AGE)

    def test_next_returns_to_the_page_that_asked_for_sign_in(self):
        response = self.client.get(self.dashboard)
        self.assertRedirects(response, f"{self.url}?next={self.dashboard}")
        page = self.client.get(response.url)
        self.assertContains(page, f'name="next" value="{self.dashboard}"')
        self.assertRedirects(self.sign_in(next=self.dashboard), self.dashboard)

    def test_next_pointing_at_another_site_is_ignored(self):
        for bad in ["https://evil.example/steal", "//evil.example", "javascript:alert(1)"]:
            self.client.logout()
            self.assertRedirects(self.sign_in(next=bad), self.dashboard, msg_prefix=bad)

    def test_sign_out_needs_a_post_and_ends_the_session(self):
        self.sign_in()
        self.assertEqual(self.client.get(reverse("frontend:logout")).status_code, 405)
        self.assertTrue(self.signed_in())
        self.assertRedirects(self.client.post(reverse("frontend:logout")), self.url)
        self.assertFalse(self.signed_in())

    def test_dashboard_shows_the_signed_in_user(self):
        self.sign_in()
        response = self.client.get(self.dashboard)
        self.assertContains(response, ", Adaeze</h1>")
        self.assertContains(response, "Sign out")
