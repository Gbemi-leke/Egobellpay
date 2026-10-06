from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib import messages

# from backend.models import Product, VendorProfile


# ── INDEX ─────────────────────────────────────────────────────
def index(request):
    return render(request, 'frontend/index.html')


# ── ABOUT ─────────────────────────────────────────────────────
def about(request):
    return render(request, 'frontend/about.html')

# ── CONTACT ─────────────────────────────────────────────────────
def contact(request):
    return render(request, 'frontend/contact.html')

# ── LOGIN ─────────────────────────────────────────────────────
def login_view(request):
    return render(request, 'frontend/login.html')

# ── DEVELOPERS ─────────────────────────────────────────────────────
def developers(request):
    return render(request, 'frontend/api-docs.html')

# ── REGISTER ───────────────────────────────────────────────────── 
def register(request):
    return render(request, 'frontend/register.html')

# ── FORGOT PASSWORD ─────────────────────────────────────────────────────
def forgot_password(request):
    return render(request, 'frontend/forgot-password.html')