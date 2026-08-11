from django.test import TestCase

from accounts.models import Role
from core.test_utils import make_user


class UserModelTests(TestCase):
    def test_default_role_is_member_and_unapproved(self):
        user = make_user("newbie", role=Role.MEMBER, is_approved=False)
        self.assertEqual(user.role, Role.MEMBER)
        self.assertFalse(user.is_approved)

    def test_is_director_true_for_director_roles(self):
        director = make_user("finance_dir", role=Role.DIRECTOR_FINANCE)
        self.assertTrue(director.is_director)
        self.assertFalse(director.is_officer)

    def test_is_director_true_for_exec(self):
        exec_user = make_user("exec1", role=Role.EXEC)
        self.assertTrue(exec_user.is_director)

    def test_is_officer_true_for_officer_roles(self):
        officer = make_user("mkt_officer", role=Role.OFFICER_MARKETING)
        self.assertTrue(officer.is_officer)
        self.assertFalse(officer.is_director)

    def test_plain_member_is_neither_director_nor_officer(self):
        member = make_user("plain")
        self.assertFalse(member.is_director)
        self.assertFalse(member.is_officer)

    def test_str_includes_role_display(self):
        user = make_user("stru", role=Role.DIRECTOR_EVENTS, first_name="Sam", last_name="Lee")
        self.assertIn("Events Director", str(user))
