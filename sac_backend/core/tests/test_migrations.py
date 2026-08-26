"""
Migration hygiene tests.

Note on scope: this deliberately does NOT try to test that migrations
apply cleanly from zero on a fresh database — that's already exercised
implicitly every time the test suite runs, since Django builds the
test database by replaying every migration before any test executes.
If a migration were broken, the whole suite would fail to start, not
just this file.

What that DOESN'T catch is the far more common real-world mistake:
changing a model (adding a field, changing a default, etc.) and
forgetting to run `makemigrations` at all. That leaves the database
schema silently out of sync with the code — everything still "works"
locally against whatever tables already exist, right up until it
doesn't (a fresh clone, a new environment, a teammate's machine). This
test catches that class of bug in CI before it ships.
"""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class MigrationConsistencyTests(TestCase):
    def test_no_missing_migrations(self):
        """
        Equivalent to running `python manage.py makemigrations --check
        --dry-run` by hand. Django's makemigrations command calls
        sys.exit(1) when it detects model changes with no matching
        migration file, which surfaces here as a SystemExit — that's
        exactly the signal we want to turn into a test failure.
        """
        output = StringIO()
        try:
            call_command(
                "makemigrations",
                check_changes=True,
                dry_run=True,
                verbosity=1,
                stdout=output,
                stderr=output,
            )
        except SystemExit:
            self.fail(
                "One or more models have changed without a matching "
                "migration file. Run `python manage.py makemigrations` "
                "for the affected app(s) and commit the result.\n\n"
                f"makemigrations output:\n{output.getvalue()}"
            )
