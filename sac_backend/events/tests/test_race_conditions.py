"""
Concurrency test for event registration capacity.

This is deliberately NOT in test_api.py alongside the other events
tests: it needs django.test.TransactionTestCase instead of the usual
TestCase, for a reason worth understanding rather than copy-pasting.

TestCase wraps each test method in one outer database transaction and
rolls it back at the end — fast, but it means every thread spawned
inside the test would be fighting over that same *uncommitted*
transaction rather than exercising real concurrent writes. That would
make this test pass even if the underlying code were still racy — a
false negative for the exact bug we're trying to catch.

TransactionTestCase commits for real and truncates tables between
tests instead. It's slower, which is exactly why it's reserved for
this one file rather than used everywhere.
"""

import threading
import unittest

from django.db import connection, connections
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Role
from core.test_utils import make_user
from events.models import Event, EventRegistration


@unittest.skipUnless(
    connection.vendor == "postgresql",
    "select_for_update() is a documented no-op on SQLite — Django's "
    "SQLite backend has no row-level locking, so this test's atomicity "
    "guarantee genuinely cannot be exercised there. What runs instead "
    "on SQLite is a coarse whole-database write lock, which behaves "
    "inconsistently across OSes/filesystems (e.g. cloud-synced folders "
    "like OneDrive actively fight SQLite's file locking on Windows). "
    "Run this against Postgres — python manage.py test "
    "events.tests.test_race_conditions --keepdb with DATABASE_URL set "
    "to your Supabase/Neon direct (non-pooled) connection string — to "
    "get a meaningful result. It's skipped, not deleted, on SQLite so "
    "CI and local sqlite runs still show it was intentionally excluded "
    "rather than silently missing.",
)
class EventCapacityRaceConditionTests(TransactionTestCase):
    def setUp(self):
        self.director = make_user("race_director", role=Role.DIRECTOR_EVENTS)
        self.event = Event.objects.create(
            name="Single-Seat Data Workshop",
            date="2026-11-01",
            start_time="10:00:00",
            created_by=self.director,
            capacity=1,
        )
        self.racers = [make_user(f"racer{i}", role=Role.MEMBER) for i in range(10)]

    def _attempt_registration(self, user, results, index):
        """Runs in its own thread with its own DB connection."""
        client = APIClient()
        client.force_authenticate(user=user)
        try:
            url = reverse("events:event-register", args=[self.event.id])
            response = client.post(url)
            results[index] = response.status_code
        except Exception as exc:
            # Without this, an exception raised inside a spawned thread
            # (e.g. a DB-locked error) just prints to stderr on its own
            # and leaves results[index] as None — which is exactly the
            # "silent failure, no useful error message" symptom. Capture
            # it into the results list instead so it shows up directly
            # in the assertion failure message.
            results[index] = f"EXCEPTION: {type(exc).__name__}: {exc}"
        finally:
            # Each thread gets its own connection; close it explicitly
            # so we don't leak connections across test runs and hit
            # "database is locked" errors on the next test.
            connections.close_all()

    def test_capacity_holds_under_concurrent_registration(self):
        """
        10 members race for 1 seat. Regardless of timing, exactly one
        registration should ever be created — the whole point of the
        select_for_update() + atomic block in events/views.py.

        Before that fix, this test fails intermittently (not always! —
        that's what makes race conditions dangerous, they pass most of
        the time in manual testing) with more than one successful
        registration on a capacity=1 event.
        """
        results = [None] * len(self.racers)
        threads = [
            threading.Thread(target=self._attempt_registration, args=(racer, results, i))
            for i, racer in enumerate(self.racers)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        successful = [code for code in results if code == status.HTTP_201_CREATED]
        rejected = [code for code in results if code == status.HTTP_400_BAD_REQUEST]

        self.assertEqual(
            len(successful), 1,
            f"Expected exactly 1 successful registration for a capacity=1 event, "
            f"got {len(successful)}. Full result codes: {results}",
        )
        self.assertEqual(len(rejected), 9)
        self.assertEqual(EventRegistration.objects.filter(event=self.event).count(), 1)