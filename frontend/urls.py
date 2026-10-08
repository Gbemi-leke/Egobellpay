from django.urls import path

from accounts import views as account_views

from . import views

app_name = 'frontend'

urlpatterns = [
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    path('contact/', views.contact, name='contact'),
    path('login/', account_views.login_view, name='login'),
    path('logout/', account_views.logout_view, name='logout'),
    path('dashboard/', account_views.dashboard, name='dashboard'),
    path('register/', views.register, name='register'),
    path('developers/', views.developers, name='developers'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),


    path('send-money/', account_views.app_page, {'page': 'send-money'}, name='send_money'),
    path('add-money/', account_views.app_page, {'page': 'add-money'}, name='add_money'),
    path('bills/', account_views.app_page, {'page': 'bills'}, name='bills'),
    path('savings/', account_views.app_page, {'page': 'savings'}, name='savings'),
    path('cards/', account_views.app_page, {'page': 'cards'}, name='cards'),
    path('transactions/', account_views.app_page, {'page': 'transactions'}, name='transactions'),
    path('beneficiaries/', account_views.app_page, {'page': 'beneficiaries'}, name='beneficiaries'),
    path('referrals/', account_views.app_page, {'page': 'referrals'}, name='referrals'),
    path('notifications/', account_views.app_page, {'page': 'notifications'}, name='notifications'),
    path('settings/', account_views.app_page, {'page': 'settings'}, name='settings'),
    path('support/', account_views.app_page, {'page': 'support'}, name='support'),
]