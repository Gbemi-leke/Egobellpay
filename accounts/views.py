from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render, resolve_url
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_POST
from django.utils import timezone

from .forms import LoginForm

def greeting_for(moment):
    if moment.hour < 12:
        return "Good morning"
    if moment.hour < 17:
        return "Good afternoon"
    return "Good evening"

def _safe_next(request):
    """
    The page to return to after signing in, taken from ?next=. Only addresses
    on this site are accepted, so a crafted link cannot send a customer to
    another website straight after they sign in.
    """
    candidate = request.POST.get("next") or request.GET.get("next") or ""
    if candidate and url_has_allowed_host_and_scheme(
        candidate, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return candidate
    return ""


@sensitive_post_parameters("password")
@never_cache
@require_http_methods(["GET", "POST"])
def login_view(request):
    next_url = _safe_next(request)
    destination = next_url or resolve_url(settings.LOGIN_REDIRECT_URL)

    if request.user.is_authenticated:
        return redirect(destination)

    form = LoginForm(request.POST or None, request=request)
    if request.method == "POST" and form.is_valid():
        login(request, form.user)
        # Ticked: stay signed in for SESSION_COOKIE_AGE (Django's default is 2 weeks).
        # Not ticked: signed out when the browser closes.
        request.session.set_expiry(settings.SESSION_COOKIE_AGE if form.cleaned_data["remember"] else 0)
        return redirect(destination)

    return render(request, "frontend/login.html", {"form": form, "next": next_url})


@require_POST
def logout_view(request):
    logout(request)
    return redirect(settings.LOGIN_URL)

@never_cache
@login_required
def dashboard(request):
    """Home page of the signed-in app."""
    return render(request, "backend/dashboard.html", {
        "page": "dashboard",
        "greeting": greeting_for(timezone.localtime()),
    })

@never_cache
@login_required
def app_page(request, page):
    """The other signed-in pages. "page" is set in urls.py, never by the visitor."""
    return render(request, f"backend/{page}.html", {"page": page})