from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        # Registers the post_save signal that emails the secretary
        # whenever a new user signs up.
        import accounts.signals  # noqa: F401
