"""
Slows down password guessing on the sign-in page.

Failed sign-ins are counted per account and per IP address. Once a limit is
reached, further attempts are refused until the window runs out, even with the
right password.

The counts live in Django's cache. The default cache is kept in the memory of
one server process, which is fine on a laptop. On the live server, point
CACHES at something every process shares (Redis, or Django's database cache),
or each process will keep its own separate count.
"""
import hashlib

from django.core.cache import cache

MAX_FAILURES_PER_ACCOUNT = 5
MAX_FAILURES_PER_IP = 20
WINDOW_SECONDS = 15 * 60


def _key(kind, value):
    digest = hashlib.sha256(str(value).encode()).hexdigest()[:32]
    return f"login-fail:{kind}:{digest}"


class LoginThrottle:
    def __init__(self, request, account_key):
        ip = request.META.get("REMOTE_ADDR", "") if request is not None else ""
        self._account_key = _key("account", account_key)
        self._limits = [
            (self._account_key, MAX_FAILURES_PER_ACCOUNT),
            (_key("ip", ip), MAX_FAILURES_PER_IP),
        ]

    @property
    def is_blocked(self):
        return any((cache.get(key) or 0) >= limit for key, limit in self._limits)

    def record_failure(self):
        for key, _ in self._limits:
            # add() only sets the key if it is missing, so the window starts
            # at the first failure and is not extended by later ones.
            cache.add(key, 0, WINDOW_SECONDS)
            try:
                cache.incr(key)
            except ValueError:  # the key expired between add() and incr()
                cache.set(key, 1, WINDOW_SECONDS)

    def reset(self):
        """Called after a successful sign-in. The IP count is left alone on purpose."""
        cache.delete(self._account_key)
