from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("create-checkout-session/", views.CreateCheckoutSessionView.as_view(), name="create-checkout-session"),
    path("webhook/", views.StripeWebhookView.as_view(), name="webhook"),
    path("mine/", views.MyPaymentsView.as_view(), name="mine"),
    path("", views.AllPaymentsView.as_view(), name="all"),
]