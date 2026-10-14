"""Maintain Macca's Facebook Login user token for Instagram catalog MUSIC.

Independent of the Instagram Login token, which has its own rotation workflow.
Facebook long-lived user tokens are approximately 60 days; Meta may refuse
extensions and require human reauthorization. This script never promises an
indefinite renewal or overwrites the secret with an unextended token.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.error
import urllib.request

REPO = "Macca-the-Gator/lab"
SECRET = "INSTAGRAM_AUDIO_ACCESS_TOKEN"
GRAPH = "https://graph.facebook.com/" + os.getenv("INSTAGRAM_GRAPH_VERSION", "v26.0")
EXPECTED_IG_ID = "17841427029514284"


class AudioTokenError(RuntimeError):
    pass


def require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise AudioTokenError(f"Missing Actions secret: {name}.")
    return value


def get(path: str, params: dict[str, str]) -> dict:
    # Never expose token-bearing query URLs or API response bodies in logs.
    url = GRAPH + path + "?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={
                "Accept": "application/json", "User-Agent": "MaccaFacebookAudioRotation/1",
        }), timeout=30) as response:
            payload = json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError):
        raise AudioTokenError(f"Meta request failed: {path}.") from None
    if not isinstance(payload, dict) or payload.get("error"):
        raise AudioTokenError(f"Meta rejected the operation: {path}.")
    return payload


def account_valid(token: str) -> bool:
    """Try optional catalog access without invalidating a publishing token.

    A catalog rejection does not prove the Facebook token is expired. Previous
    Macca publishing used its own INSTAGRAM_ACCESS_TOKEN and must stay intact.
    """
    try:
        result = get("/ig_audio", {
            "audio_type": "music", "user_id": EXPECTED_IG_ID, "access_token": token,
        })
    except AudioTokenError:
        print(
            "::warning::Optional Facebook audio token cannot read /ig_audio. "
            "Keeping existing secrets unchanged; the Reel publisher also checks "
            "the original Instagram publishing token for MUSIC."
        )
        return False
    if not isinstance(result.get("audio"), list):
        print("::warning::Facebook audio response has no music list; current secrets unchanged.")
        return False
    print("Facebook music catalog access confirmed.")
    return True


def app_id(token: str) -> str:
    configured = os.environ.get("INSTAGRAM_AUDIO_APP_ID", "").strip()
    if configured:
        return configured
    info = get("/app", {"fields": "id", "access_token": token})
    value = str(info.get("id") or "").strip()
    if not value.isdecimal():
        raise AudioTokenError("Cannot resolve Meta App ID; define INSTAGRAM_AUDIO_APP_ID variable.")
    return value


def expiry(token: str, ident: str, secret: str) -> int:
    record = get("/debug_token", {
        "input_token": token, "access_token": ident + "|" + secret,
    }).get("data") or {}
    if not record.get("is_valid") or str(record.get("app_id")) != ident:
        raise AudioTokenError("Audio user token is invalid or belongs to another Meta app.")
    return int(record.get("expires_at") or 0)


def exchange(token: str, ident: str, secret: str) -> tuple[str, int]:
    info = get("/oauth/access_token", {
        "grant_type": "fb_exchange_token", "client_id": ident,
        "client_secret": secret, "fb_exchange_token": token,
    })
    refreshed = str(info.get("access_token") or "").strip()
    return refreshed, int(info.get("expires_in") or 0)


def update_secret(token: str) -> None:
    credential = require("INSTAGRAM_TOKEN_ROTACION")
    environment = os.environ.copy()
    environment["GH_TOKEN"] = credential
    result = subprocess.run(
        ["gh", "secret", "set", SECRET, "--repo", REPO],
        input=token + "\n", text=True, env=environment,
        capture_output=True, timeout=45, check=False,
    )
    if result.returncode:
        raise AudioTokenError("GitHub Secrets write failed; check INSTAGRAM_TOKEN_ROTACION access.")
    print("Macca Facebook Audio GitHub Secret updated after Meta verification.")


def maintain(*, preflight: bool = False) -> str:
    old = require(SECRET)
    music_available = account_valid(old)
    # Meta requires an app secret to debug expiry and exchange a *Facebook*
    # user token; do not require a new secret just to keep the old publisher
    # working. Missing optional configuration must never reset tokens.
    secret = os.environ.get("INSTAGRAM_APP_SECRET", "").strip()
    if not secret:
        print(
            "::warning::INSTAGRAM_APP_SECRET is not configured. "
            "Facebook Login expiry inspection and rotation are unavailable; "
            "the existing token was preserved. Instagram publishing is independent."
        )
        return "unchanged_no_app_secret"
    if not music_available:
        print(
            "::warning::Music token is not validated for the Macca catalog. "
            "Skipping rotation instead of replacing an unverified token."
        )
        return "unchanged_unverified_catalog"
    ident = app_id(old)
    now = int(time.time())
    old_exp = expiry(old, ident, secret)
    if old_exp <= now:
        raise AudioTokenError("Facebook Audio token expired; manual Meta reauthorization required.")
    days = (old_exp - now) // 86400
    print(f"Macca Facebook Audio token has approximately {days} days left.")
    if preflight or days > 30:
        return "valid"
    fresh, duration = exchange(old, ident, secret)
    if not fresh or duration < 45 * 86400:
        raise AudioTokenError("Meta did not issue a long-lived Facebook token; reauthorize.")
    print("::add-mask::" + fresh, flush=True)
    if not account_valid(fresh):
        raise AudioTokenError("Exchanged Facebook user token cannot access MUSIC; existing secret unchanged.")
    next_exp = expiry(fresh, ident, secret)
    if next_exp <= max(old_exp + 86400, now + 45 * 86400):
        raise AudioTokenError("Meta did not extend expiry; manual Facebook Login reauthorization needed.")
    update_secret(fresh)
    print(f"Macca Facebook Audio token extended to approximately {(next_exp - now) // 86400} days.")
    return "rotated"


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "preflight"
    if mode not in ("preflight", "renew"):
        raise SystemExit("Usage: python scripts/facebook_audio_token_rotation.py preflight|renew")
    try:
        maintain(preflight=(mode == "preflight"))
    except (AudioTokenError, ValueError, OSError, subprocess.TimeoutExpired) as error:
        print("::error::Macca Facebook audio maintenance: " + str(error), file=sys.stderr)
        raise SystemExit(1)
