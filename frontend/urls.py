from django.urls import path
from frontend import views

app_name = 'frontend'

urlpatterns = [
    path('',                         views.index,            name='index'),
    path('about/',                   views.about,            name='about'),
    path('contact/',                 views.contact,          name='contact'),
    path('login/',                   views.login_view,       name='login'),
    path('register/',                views.register,         name='register'),
    path('developers/',              views.developers,       name='developers'),
    path('forgot-password/',         views.forgot_password,  name='forgot_password'),
]
