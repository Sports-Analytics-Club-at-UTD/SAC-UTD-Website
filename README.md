# SAC-UTD-Website









# SAC Backend

Django + Django REST Framework API for the Sports Analytics Club website.
Ships as a pure JSON API — no assumptions about what the frontend is, so
it can be built/tested independently of the frontend work.

## Architecture

One Django "app" per feature area, matching the club's org structure and
this project's feature branches:

| App | Covers |
|---|---|
| `core` | Shared base model (created_at/updated_at) |
| `accounts` | Custom `User` w/ roles, signup, Secretary approval workflow |
| `events` | Club calendar, event registration |
| `projects` | Projects Portal — Kanban boards (`Project` + `Task`) |
| `media_hub` | Marketing uploads + approval, homepage media scroller feed |
| `finance` | Budget line items + chart summary endpoint |
| `rnd` | Ideas, industry connections, R&D officer workshop/to-dos |
| `requests_hub` | Director -> Exec request/ticket system |

All routes are mounted under `/api/` (see `config/urls.py`). Every app
owns its own `urls.py`, `models.py`, `serializers.py`, `views.py`.

### Roles (`accounts.models.Role`)

`member`, `officer_marketing`, `officer_rnd`, `director_secretary`,
`director_events`, `director_marketing`, `director_finance`,
`director_rnd`, `exec`. Permission classes in each app key off this
field — add a role in one place (`accounts/models.py`) and reference it
anywhere.

### Auth

Token auth via DRF's `authtoken` (`POST /api/auth/login/` with
username/password returns `{"token": "..."}`). Send it back as
`Authorization: Token <key>` on every subsequent request. Good enough to
start; swap for JWT/session auth later if you want refresh tokens.

## Local setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env — at minimum set DATABASE_URL to your Supabase/Neon
# connection string, and DJANGO_SECRET_KEY to something random
```

### Database (Supabase or Neon free tier)

1. Create a project on either service and grab the Postgres connection
   string.
   - **Supabase**: Project Settings -> Database -> Connection string ->
     URI. Use the pooled URI (port 6543) once deployed; the direct URI
     (port 5432) works fine for local dev/migrations.
   - **Neon**: Project -> Connection Details. Keep `?sslmode=require` on
     the URL — Neon requires SSL.
2. Paste it into `.env` as `DATABASE_URL=...`.
3. Run migrations:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

4. Visit `http://127.0.0.1:8000/admin/` to confirm the connection and
   poke around the data with the Django admin (this alone is a
   surprisingly functional temporary Director Portal while the real
   frontend is being built).

## Trying the API without a frontend

DRF's browsable API works out of the box — visit any endpoint in a
browser (e.g. `http://127.0.0.1:8000/api/events/`) while logged into
`/admin/` and you get a clickable, form-based UI for every CRUD
operation. Great for testing each feature in isolation before the
frontend exists.

## Suggested branch workflow (matches what you described)

```
main
 └── feature/accounts-roles         (already scaffolded here)
 └── feature/events-calendar
 └── feature/projects-kanban
 └── feature/media-approval
 └── feature/finance-dashboard
 └── feature/rnd-tracking
 └── feature/exec-requests
```

Since each feature lives in its own Django app, branches rarely touch
the same files — PRs should merge cleanly. Run
`python manage.py makemigrations <app>` at the end of each feature
branch and commit the migration file with the code that needs it.

## What's stubbed vs. fleshed out

**Fully wired (models + serializers + views + permissions + admin):**
accounts, events, projects, media_hub, finance, rnd, requests_hub.

**Not yet started (intentionally — build when you get to that feature):**
- Stripe integration (payment model/webhook handling)
- Google Drive API wiring for `media_hub.MediaUpload` (fields for it
  already exist: `gdrive_file_id`, `gdrive_url`)
- Live score scroller data source (separate concern — likely a
  scheduled task pulling a sports API, not user-submitted data)
- Custom help agent
- User count endpoint (trivial — `User.objects.filter(is_approved=True).count()`)

## Next steps

1. `python manage.py makemigrations && python manage.py migrate` against
   your real Supabase/Neon DB to confirm everything connects.
2. `createsuperuser`, log into `/admin/`, create a couple of test users
   with different roles, and manually poke each endpoint via the
   browsable API to sanity check the permission classes.
3. Move to the **Director Portal** feature — the `accounts.whoami`
   endpoint already returns everything a frontend needs
   (`role`, `is_director`, `is_officer`) to decide which portal tabs to
   render.
