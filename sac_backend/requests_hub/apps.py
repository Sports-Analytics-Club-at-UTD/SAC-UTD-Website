from django.apps import AppConfig


class RequestsHubConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "requests_hub"

    def ready(self):
        import requests_hub.signals  # noqa: F401
