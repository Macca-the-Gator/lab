"""Offline Facebook Login token-maintenance tests. No Meta/GitHub requests."""
import os
import unittest
from unittest.mock import patch

from scripts import facebook_audio_token_rotation as rotation


class FacebookAudioRotationTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {
            "INSTAGRAM_AUDIO_ACCESS_TOKEN": "old-test-token",
            "INSTAGRAM_APP_SECRET": "app-secret-only-for-test",
            "INSTAGRAM_AUDIO_APP_ID": "12345",
            "INSTAGRAM_TOKEN_ROTACION": "test-github-credential",
        })
        self.env.start()
        self.addCleanup(self.env.stop)

    @patch.object(rotation, 'account_valid', return_value=False)
    @patch.object(rotation, 'update_secret')
    def test_catalog_rejection_keeps_existing_tokens(self, write, available):
        self.assertEqual(rotation.maintain(), 'unchanged_unverified_catalog')
        write.assert_not_called()

    @patch.object(rotation, 'account_valid', return_value=False)
    @patch.object(rotation, 'update_secret')
    def test_missing_app_secret_does_not_break_existing_publisher(self, write, available):
        with patch.dict(os.environ, {'INSTAGRAM_APP_SECRET': ''}):
            self.assertEqual(rotation.maintain(), 'unchanged_no_app_secret')
        write.assert_not_called()

    @patch.object(rotation, 'get', side_effect=rotation.AudioTokenError('catalog unavailable'))
    def test_music_catalog_error_does_not_claim_token_expired(self, meta_get):
        self.assertFalse(rotation.account_valid('previously-working-token'))

    @patch.object(rotation, "account_valid")
    @patch.object(rotation, "expiry", return_value=1000000 + 55 * 86400)
    @patch.object(rotation, "update_secret")
    @patch.object(rotation.time, "time", return_value=1000000)
    def test_long_lived_token_not_rotated_early(self, now, update, expiry, account):
        self.assertEqual(rotation.maintain(), "valid")
        update.assert_not_called()

    @patch.object(rotation, "account_valid")
    @patch.object(rotation, "expiry", side_effect=[1000000 + 3 * 86400, 1000000 + 58 * 86400])
    @patch.object(rotation, "exchange", return_value=("new-test-token", 58 * 86400))
    @patch.object(rotation, "update_secret")
    @patch.object(rotation.time, "time", return_value=1000000)
    def test_real_expiry_extension_required_before_secret_write(self, now, update, exchange, expiry, account):
        self.assertEqual(rotation.maintain(), "rotated")
        update.assert_called_once_with("new-test-token")
        self.assertEqual(account.call_count, 2)

    @patch.object(rotation, "account_valid")
    @patch.object(rotation, "expiry", side_effect=[1000000 + 4 * 86400, 1000000 + 4 * 86400])
    @patch.object(rotation, "exchange", return_value=("not-actually-extended", 58 * 86400))
    @patch.object(rotation, "update_secret")
    @patch.object(rotation.time, "time", return_value=1000000)
    def test_facebook_refuses_extension_preserves_current_secret(self, now, update, exchange, expiry, account):
        with self.assertRaisesRegex(rotation.AudioTokenError, "did not extend"):
            rotation.maintain()
        update.assert_not_called()

    @patch.object(rotation, "account_valid")
    @patch.object(rotation, "expiry", return_value=1000000 + 3600)
    @patch.object(rotation, "exchange")
    @patch.object(rotation.time, "time", return_value=1000000)
    def test_preflight_never_performs_live_exchange(self, now, exchange, expiry, account):
        self.assertEqual(rotation.maintain(preflight=True), "valid")
        exchange.assert_not_called()

    @patch.object(rotation, "account_valid")
    @patch.object(rotation, "expiry", return_value=1000000 - 1)
    @patch.object(rotation, "update_secret")
    @patch.object(rotation.time, "time", return_value=1000000)
    def test_expired_token_requires_reauthorization(self, now, update, expiry, account):
        with self.assertRaisesRegex(rotation.AudioTokenError, "reauthorization"):
            rotation.maintain()
        update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
