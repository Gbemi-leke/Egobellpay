"""The signed-in pages: only for signed-in customers, and each one renders."""
from django.test import TestCase
from django.urls import reverse

from .models import User

PAGES = ["dashboard", "send_money", "add_money", "bills", "savings", "cards", "transactions",
         "beneficiaries", "referrals", "notifications", "settings", "support"]


class AppPageTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email="adaeze@example.com", phone="08031234567", password="Str0ngpass1",
                                            first_name="Adaeze", last_name="Okonkwo")

    def test_every_page_sends_a_signed_out_visitor_to_sign_in(self):
        for name in PAGES:
            url = reverse(f"frontend:{name}")
            self.assertRedirects(self.client.get(url), f"{reverse('frontend:login')}?next={url}", msg_prefix=name)

    def test_every_page_opens_for_a_signed_in_customer(self):
        self.client.force_login(self.user)
        for name in PAGES:
            response = self.client.get(reverse(f"frontend:{name}"))
            self.assertEqual(response.status_code, 200, name)
            self.assertContains(response, "Adaeze Okonkwo", msg_prefix=name)      # account menu
            self.assertContains(response, 'aria-current="page"', msg_prefix=name)  # its menu item is highlighted
            self.assertNotContains(response, ".html", msg_prefix=name)             # no leftover template links

    def test_pages_are_not_cached_by_the_browser(self):
        self.client.force_login(self.user)
        self.assertIn("no-store", self.client.get(reverse("frontend:dashboard"))["Cache-Control"])

    def test_dashboard_greets_the_customer_by_name(self):
        self.client.force_login(self.user)
        self.assertContains(self.client.get(reverse("frontend:dashboard")), ", Adaeze</h1>")

    def test_sign_out_is_a_post_form_and_ends_the_session(self):
        self.client.force_login(self.user)
        page = self.client.get(reverse("frontend:dashboard"))
        self.assertContains(page, f'<form method="post" action="{reverse("frontend:logout")}">')
        self.assertEqual(self.client.get(reverse("frontend:logout")).status_code, 405)
        self.assertRedirects(self.client.post(reverse("frontend:logout")), reverse("frontend:login"))
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_settings_shows_the_customers_own_details(self):
        self.client.force_login(self.user)
        page = self.client.get(reverse("frontend:settings"))
        self.assertContains(page, 'value="adaeze@example.com"')
        self.assertContains(page, 'value="+2348031234567"')
