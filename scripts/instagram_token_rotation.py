#!/usr/bin/env python3
"""Validate or rotate the Macca Instagram publishing token safely.

Instagram Login long-lived tokens can be refreshed. Facebook Page access tokens
use a different lifecycle and MUST NOT be sent to that refresh endpoint.

No token values, Graph API response bodies, or gh stderr are printed.
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = "Macca-the-Gator/lab"
SECRET = "INSTAGRAM_ACCESS_TOKEN"
INSTAGRAM_GRAPH = "https://graph.instagram.com"
FACEBOOK_GRAPH = "https://graph.facebook.com/v26.0"
EXPECTED_PAGE_ID = "1398291306701395"


class RotationError(RuntimeError):
    pass


def api_json(base: str, path: str, token: str, *, params: dict[str, str] | None = None) -> dict:
    """Graph API errors deliberately omit body/URL to protect secrets."""
    query = urllib.parse.urlencode(params or {})
    url = f"{base}/{path}" + (f"?{query}" if query else "")
    req = urllib.request.Request(
        url,
        headers={"Authorization": "Bearer " + token, "Accept": "application/json",
                 "User-Agent": "MaccaInstagramRotation/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        raise RotationError("Meta API request or authentication failed.") from None
    if not isinstance(result, dict) or result.get("error"):
        raise RotationError("Meta API rejected the token operation.")
    return result


def identify_token(token: str) -> tuple[str, str]:
    """Fail closed if neither documented login method identifies the token."""
    try:
        identity = api_json(INSTAGRAM_GRAPH, "me", token, params={"fields": "id,username"})
        instagram_id = str(identity.get("id") or identity.get("user_id") or "").strip()
        if instagram_id:
            return "instagram_login", instagram_id
    except RotationError:
        pass

    try:
        page = api_json(FACEBOOK_GRAPH, "me", token, params={"fields": "id,name"})
    except RotationError:
        raise RotationError(
            "Token was not accepted as Instagram Login or Facebook Page; "
            "the current GitHub secret was not changed."
        ) from None
    page_id = str(page.get("id") or "").strip()
    if page_id != EXPECTED_PAGE_ID:
        raise RotationError(
            "Facebook token is not for the configured Macca Page; "
            "automatic replacement is blocked."
        )
    return "facebook_page", page_id


def gh(args: list[str], credential: str, *, input_text: str | None = None) -> None:
    if not credential:
        raise RotationError("Missing INSTAGRAM_TOKEN_ROTACION Actions secret.")
    env = os.environ.copy()
    env["GH_TOKEN"] = credential
    try:
        result = subprocess.run(
            ["gh", *args], input=input_text, text=True, capture_output=True,
            timeout=35, env=env, check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        raise RotationError("GitHub secret API request failed.") from None
    if result.returncode:
        # Never reveal stdout/stderr, even on failures.
        raise RotationError("GitHub secret API rejected the request; check the fine-grained PAT's Secrets: Read and Write permission.")


def verify_github_access(credential: str) -> None:
    """Verify both GitHub Secret read and write permissions without exposing tokens."""
    gh(["api", f"repos/{REPOSITORY}/actions/secrets/public-key", "--jq", ".key_id"], credential)
    probe_name = "IG_ROTATION_PROBE_" + secrets.token_hex(6).upper()
    created = False
    try:
        gh(
            ["secret", "set", probe_name, "--repo", REPOSITORY],
            credential, input_text="nonsecret-probe\n",
        )
        created = True
    finally:
        if created:
            gh(["secret", "delete", probe_name, "--repo", REPOSITORY], credential)




def check_and_rotate(old_token: str, credential: str, *, preflight: bool = False) -> str:
    if not old_token:
        raise RotationError("Missing INSTAGRAM_ACCESS_TOKEN Actions secret.")

    kind, identity_id = identify_token(old_token)
    if kind == "facebook_page":
        print(
            "Facebook Page access token is valid; it is not an Instagram Login token. "
            "The Page token remains unchanged. Check its expiry in Meta Access Token Debugger."
        )
        return "page_valid"

    verify_github_access(credential)
    if preflight:
        print("Instagram Login token and GitHub Secrets access verified (no rotation performed).")
        return "preflight_ok"

    refreshed = api_json(
        INSTAGRAM_GRAPH, "refresh_access_token", old_token,
        params={"grant_type": "ig_refresh_token", "access_token": old_token},
    )
    new_token = str(refreshed.get("access_token") or "").strip()
    expires = int(refreshed.get("expires_in") or 0)
    if not new_token or expires < 14 * 24 * 3600:
        raise RotationError("Meta did not return a valid long-lived token; existing Secret unchanged.")

    print("::add-mask::" + new_token, flush=True)
    refreshed_kind, refreshed_id = identify_token(new_token)
    if refreshed_kind != kind or refreshed_id != identity_id:
        raise RotationError("Refreshed Instagram token identity changed; existing Secret unchanged.")
    gh(["secret", "set", SECRET, "--repo", REPOSITORY], credential, input_text=new_token + "\n")
    print("Instagram long-lived token rotated in Macca Actions Secrets.")
    return "rotated"


def main() -> None:
    parser = argparse.ArgumentParser(description="Safe Instagram rotation")
    parser.add_argument("mode", choices=["preflight", "renew"])
    args = parser.parse_args()
    try:
        check_and_rotate(
            os.getenv("INSTAGRAM_ACCESS_TOKEN", "").strip(),
            os.getenv("INSTAGRAM_TOKEN_ROTACION", "").strip(),
            preflight=args.mode == "preflight",
        )
    except (RotationError, ValueError) as err:
        print("::error::Instagram token check failed: " + str(err), file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
