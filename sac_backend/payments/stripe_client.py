import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(*, amount, currency, description, success_url, cancel_url, metadata):
    """
    Thin wrapper around Stripe's Checkout Session creation, kept in its
    own module so tests can mock this ONE function (see
    payments/tests/test_checkout.py) instead of reaching into the
    stripe SDK directly, and so nothing else in the codebase needs to
    know Stripe's specific API shape.

    `amount` is in dollars (Decimal or float) — Stripe's API wants
    integer cents, so the conversion happens here, in exactly one place.
    """
    return stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": currency,
                    "product_data": {"name": description},
                    "unit_amount": int(round(float(amount) * 100)),
                },
                "quantity": 1,
            }
        ],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )