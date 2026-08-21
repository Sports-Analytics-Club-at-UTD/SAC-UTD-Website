"""
Django settings for the Sports Analytics Club (SAC) backend.

Reads all secrets/config from environment variables (see .env.example).
Designed to point at a hosted Postgres instance — Supabase or Neon —
via a single DATABASE_URL connection string.
"""

from pathlib import Path
import environ
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
# Reads a .env file in the project root if present. In production
# (Railway/Render/etc.) these are just set as real environment variables.
environ.Env.read_env(BASE_DIR / ".env")

# --- Core ---------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Applications ---------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_filters",
]

LOCAL_APPS = [
    "core",
    "accounts",
    "events",
    "projects",
    "media_hub",
    "finance",
    "rnd",
    "requests_hub",
    "portal"
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Custom user model (accounts app) — must be set before the first migration.
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database -------------------------------------------------------------
# Supabase / Neon both give you a single Postgres connection string.
# Put it in .env as DATABASE_URL=postgres://user:pass@host:port/dbname
#
# Neon: enable ?sslmode=require in the URL (Neon requires SSL).
# Supabase: use the "connection pooling" URL (port 6543) for serverless/
# short-lived connections, or the direct URL (port 5432) for migrations.

DATABASE_URL = env("DATABASE_URL", default=None)

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=env.bool("DB_SSL_REQUIRED", default=True),
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {"timeout": 20},
            "TEST": {
                "NAME": BASE_DIR / "test_db.sqlite3",
            },
        }
    }

# --- Password validation ---------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalization ---------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="America/Chicago")
USE_I18N = True
USE_TZ = True

# --- Static / media ---------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS -------------------------------------------------------------------
# Frontend origin(s) allowed to call this API. Add your dev server and,
# later, your deployed frontend domain.

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
)
CORS_ALLOW_CREDENTIALS = True

# --- Django REST Framework ---------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # TokenAuthentication first: it defines authenticate_header, so
        # an unauthenticated request correctly returns 401 with a
        # WWW-Authenticate header. If SessionAuthentication were listed
        # first (it doesn't define one), DRF falls back to 403 for
        # every unauthenticated request site-wide, which masks the real
        # "you're not logged in" signal API clients look for.
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

# --- Email (secretary notification on new signup, exec notifications) -------
# For real sending, swap to SMTP (e.g. SendGrid/Mailgun) via env vars.
# Defaults to console backend so emails just print to the runserver log
# during development.

EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@sportsanalyticsclub.org")
SECRETARY_EMAIL = env("SECRETARY_EMAIL", default="secretary@sportsanalyticsclub.org")
EXEC_NOTIFICATION_EMAILS = env.list("EXEC_NOTIFICATION_EMAILS", default=[])
