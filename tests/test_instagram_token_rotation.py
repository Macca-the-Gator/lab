"""Offline contract tests: never call Meta or GitHub; never mutate real secrets."""
import unittest
from unittest.mock import patch

from scripts import instagram_token_rotation as rotation


class RotationTests(unittest.TestCase):
    def test_missing_token_fails_closed(self):
        with self.assertRaisesRegex(rotation.RotationError, "INSTAGRAM_ACCESS_TOKEN"):
            rotation.check_and_rotate("", "github-credential")

    @patch.object(rotation, "identify_token", return_value=("facebook_page", rotation.EXPECTED_PAGE_ID))
    @patch.object(rotation, "gh")
    def test_valid_page_token_untouched(self, gh, identify):
        status = rotation.check_and_rotate("page-token", "", preflight=False)
        self.assertEqual(status, "page_valid")
        gh.assert_not_called()

    @patch.object(rotation, "identify_token", return_value=("instagram_login", "ig-account"))
    @patch.object(rotation, "api_json")
    @patch.object(rotation, "gh")
    def test_preflight_checks_both_read_and_write_without_refresh(self, gh, api, identity):
        self.assertEqual(rotation.check_and_rotate("ig-old", "github", preflight=True), "preflight_ok")
        self.assertEqual(gh.call_count, 3)
        self.assertEqual(gh.call_args_list[0].args[0][:2], ["api", f"repos/{rotation.REPOSITORY}/actions/secrets/public-key"])
        self.assertEqual(gh.call_args_list[1].args[0][0:2], ["secret", "set"])
        self.assertEqual(gh.call_args_list[2].args[0][0:2], ["secret", "delete"])
        api.assert_not_called()

    @patch.object(rotation, "identify_token", side_effect=[("instagram_login", "ig-account"), ("instagram_login", "ig-account")])
    @patch.object(rotation, "api_json", return_value={"access_token": "new-private-ig-token", "expires_in": 5184000})
    @patch.object(rotation, "gh")
    def test_ig_token_rotated_and_written_only_after_verification(self, gh, api, identity):
        self.assertEqual(rotation.check_and_rotate("old", "github"), "rotated")
        self.assertEqual(gh.call_count, 4)
        self.assertEqual(gh.call_args_list[-1].args[0], [
            "secret", "set", "INSTAGRAM_ACCESS_TOKEN", "--repo", rotation.REPOSITORY,
        ])
        self.assertEqual(gh.call_args_list[-1].kwargs["input_text"], "new-private-ig-token\n")

    @patch.object(rotation, "identify_token", return_value=("instagram_login", "ig-account"))
    @patch.object(rotation, "api_json", side_effect=rotation.RotationError("Meta API request failed."))
    @patch.object(rotation, "gh")
    def test_meta_failure_never_overwrites_real_token(self, gh, api, identity):
        with self.assertRaises(rotation.RotationError):
            rotation.check_and_rotate("old", "github")
        self.assertFalse(any(
            c.args[0][0:3] == ["secret", "set", rotation.SECRET] for c in gh.call_args_list
        ))

    @patch.object(rotation, "identify_token", side_effect=[("instagram_login", "ig-old-account"), ("instagram_login", "different-account")])
    @patch.object(rotation, "api_json", return_value={"access_token": "new", "expires_in": 5184000})
    @patch.object(rotation, "gh")
    def test_new_token_identity_mismatch_is_rejected(self, gh, api, identity):
        with self.assertRaisesRegex(rotation.RotationError, "identity changed"):
            rotation.check_and_rotate("old", "github")
        self.assertFalse(any(
            c.args[0][0:3] == ["secret", "set", rotation.SECRET] for c in gh.call_args_list
        ))

    @patch.object(rotation, "identify_token", return_value=("instagram_login", "ig-account"))
    @patch.object(rotation, "api_json")
    def test_missing_github_credential_never_requests_meta_refresh(self, api, identity):
        with self.assertRaisesRegex(rotation.RotationError, "INSTAGRAM_TOKEN_ROTACION"):
            rotation.check_and_rotate("old", "", preflight=False)
        api.assert_not_called()

    @patch.object(rotation, "api_json")
    @patch.object(rotation, "gh")
    def test_facebook_user_id_is_not_misidentified_as_wrong_page(self, gh, api):
        api.side_effect = [rotation.RotationError("not Instagram Login"), {"id": "fb-user-id"}]
        self.assertEqual(
            rotation.identify_token("existing-macca-token"),
            ("facebook_graph_user_or_page", "fb-user-id"),
        )
        gh.assert_not_called()

    @patch.object(rotation, "identify_token", return_value=("facebook_graph_user_or_page", "fb-user-id"))
    @patch.object(rotation, "gh")
    def test_existing_facebook_user_token_is_never_overwritten(self, gh, identity):
        self.assertEqual(rotation.check_and_rotate("existing-macca-token", "", preflight=False),
                         "facebook_graph_unchanged")
        gh.assert_not_called()

    @patch.object(rotation, "api_json")
    def test_unrecognized_token_fails_without_write(self, api):
        api.side_effect = [rotation.RotationError("bad ig token"), rotation.RotationError("bad fb token")]
        with self.assertRaisesRegex(rotation.RotationError, "not accepted"):
            rotation.identify_token("token")


if __name__ == "__main__":
    unittest.main()
