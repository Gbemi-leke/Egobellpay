from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib import messages

# from backend.models import Product, VendorProfile


# ── INDEX ─────────────────────────────────────────────────────
def index(request):
    return render(request, 'frontend/index.html')