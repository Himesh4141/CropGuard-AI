"""Offline tests: extract actual function AST with synthetic repositories.

Never imports the running backend, reads .env, or creates a DB connection.
"""
import ast
from pathlib import Path
import unittest

BASE = Path(__file__).resolve().parents[2]
ACCOUNT = BASE / "app/services/firebase_account.py"
ROUTES = BASE / "app/api/v1/endpoints/auth.py"


class FakeIntegrityError(Exception):
    pass


class FakeUser:
    def __init__(self, **values):
        self.__dict__.update(values)


class FakeDB:
    def __init__(self, users=None):
        self.users = users or {}
        self.rollbacks = 0
        self.conflict = None

    def rollback(self):
        self.rollbacks += 1


class FakeRepo:
    def __init__(self, db):
        self.db = db

    def get_by_email(self, email):
        return self.db.users.get(email)

    def add(self, user):
        if self.db.conflict:
            self.db.users[user.email] = self.db.conflict
            self.db.conflict = None
            raise FakeIntegrityError("race")
        self.db.users[user.email] = user
        return user


class FakeRole:
    FARMER = "farmer"


class FakeAuthError(Exception):
    pass


def load_resolver():
    tree = ast.parse(ACCOUNT.read_text(encoding="utf-8"))
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "resolve_firebase_user")
    ns = dict(
        Session=FakeDB, FirebaseIdentity=object, User=FakeUser,
        UserRole=FakeRole, UserRepository=FakeRepo,
        AuthenticationError=FakeAuthError, IntegrityError=FakeIntegrityError,
        hash_password=lambda p: f"secure-hash:{p}",
        token_urlsafe=lambda n: "random-test-secret-" + str(n),
    )
    exec(compile(ast.Module(body=[fn], type_ignores=[]), str(ACCOUNT), "exec"), ns)
    return ns["resolve_firebase_user"]


class FirebaseAccountOfflineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.resolve = staticmethod(load_resolver())

    @staticmethod
    def identity(email="Farmer@Example.com"):
        return type("VerifiedIdentity", (), {"email": email})()

    def test_new_identity_is_farmer_only(self):
        db = FakeDB()
        result = self.resolve(db, self.identity())
        self.assertEqual(result.role, "farmer")
        self.assertEqual(result.email, "farmer@example.com")
        self.assertTrue(result.password_hash.startswith("secure-hash:"))

    def test_existing_admin_preserved(self):
        existing = FakeUser(email="farmer@example.com", role="admin", is_active=True, id="same-id", password_hash="original")
        db = FakeDB({existing.email: existing})
        self.assertIs(self.resolve(db, self.identity()), existing)
        self.assertEqual((existing.role, existing.password_hash, existing.id), ("admin", "original", "same-id"))

    def test_existing_officer_preserved(self):
        existing = FakeUser(email="farmer@example.com", role="officer", is_active=True)
        db = FakeDB({existing.email: existing})
        self.assertIs(self.resolve(db, self.identity()), existing)

    def test_disabled_account_rejected(self):
        existing = FakeUser(email="farmer@example.com", role="farmer", is_active=False)
        with self.assertRaises(FakeAuthError):
            self.resolve(FakeDB({existing.email: existing}), self.identity())

    def test_racing_create_reuses_record_after_rollback(self):
        db = FakeDB()
        winner = FakeUser(email="farmer@example.com", role="admin", is_active=True)
        db.conflict = winner
        self.assertIs(self.resolve(db, self.identity()), winner)
        self.assertEqual(db.rollbacks, 1)

    def test_invalid_email_rejected(self):
        with self.assertRaises(FakeAuthError):
            self.resolve(FakeDB(), self.identity("invalid"))

    def test_original_legacy_routes_remain(self):
        text = ROUTES.read_text(encoding="utf-8")
        for path in ('"/login"', '"/mobile/login"', '"/google"', '"/mobile/google"'):
            self.assertIn(path, text)
        self.assertIn('"/firebase"', text)
        self.assertIn('"/mobile/firebase"', text)

    def test_firebase_default_off_and_native_response_split(self):
        tree = ast.parse(ROUTES.read_text(encoding="utf-8"))
        names = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
        self.assertIn("_firebase_exchange_enabled", names)
        self.assertIn("firebase_login_web", names)
        self.assertIn("firebase_login_mobile", names)
        web = ast.unparse(names["firebase_login_web"])
        native = ast.unparse(names["firebase_login_mobile"])
        self.assertIn("_set_refresh_cookie", web)
        self.assertNotIn("_set_refresh_cookie", native)
        self.assertIn("_mobile_response", native)
        enable = ast.unparse(names["_firebase_exchange_enabled"])
        self.assertIn("'false'", enable)

    def test_a1_rotation_not_changed_by_patch(self):
        text = ROUTES.read_text(encoding="utf-8")
        self.assertIn("rotate_refresh", text)
        self.assertIn("/mobile/refresh", text)

if __name__ == "__main__":
    unittest.main()
