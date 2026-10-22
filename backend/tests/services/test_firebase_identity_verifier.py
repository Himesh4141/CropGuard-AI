import unittest
from unittest.mock import patch

from app.services.firebase_identity import (
    PROJECT_ID, EXPECTED_ISSUER, verify_firebase_identity
)


def claims():
    return {
        "iss": EXPECTED_ISSUER,
        "aud": PROJECT_ID,
        "sub": "firebase-user-123",
        "email": "Farmer@Example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "google.com"},
    }


class FirebaseIdentityTests(unittest.TestCase):

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_google_login(self, mock):
        mock.return_value = claims()
        result = verify_firebase_identity("x" * 100)
        self.assertEqual(result.email, "farmer@example.com")
        self.assertEqual(result.provider, "google.com")
        self.assertEqual(mock.call_args.kwargs["audience"], PROJECT_ID)

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_password_login(self, mock):
        data = claims()
        data["firebase"]["sign_in_provider"] = "password"
        mock.return_value = data
        self.assertEqual(
            verify_firebase_identity("x" * 100).provider, "password"
        )

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_unverified_email_rejected(self, mock):
        data = claims()
        data["email_verified"] = False
        mock.return_value = data
        with self.assertRaises(ValueError):
            verify_firebase_identity("x" * 100)

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_wrong_project_rejected(self, mock):
        data = claims()
        data["aud"] = "wrong-project"
        mock.return_value = data
        with self.assertRaises(ValueError):
            verify_firebase_identity("x" * 100)

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_wrong_issuer_rejected(self, mock):
        data = claims()
        data["iss"] = "https://example.com"
        mock.return_value = data
        with self.assertRaises(ValueError):
            verify_firebase_identity("x" * 100)

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_invalid_signature_rejected(self, mock):
        mock.side_effect = ValueError("Invalid signature")
        with self.assertRaises(ValueError):
            verify_firebase_identity("x" * 100)

    @patch("app.services.firebase_identity.id_token.verify_firebase_token")
    def test_unsupported_provider_rejected(self, mock):
        data = claims()
        data["firebase"]["sign_in_provider"] = "anonymous"
        mock.return_value = data
        with self.assertRaises(ValueError):
            verify_firebase_identity("x" * 100)


if __name__ == "__main__":
    unittest.main()