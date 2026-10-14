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


def account_valid(token: str) -> None:
    # The same token must actually list usable music for Macca's account.
    result = get("/ig_audio", {
        "audio_type": "music", "user_id": EXPECTED_IG_ID, "access_token": token,
    })
    if not isinstance(result.get("audio"), list):
        raise AudioTokenError("Macca Instagram MUSIC catalog is not accessible.")
    print("Macca Facebook Audio token can access the Instagram music catalog.")


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
    account_valid(old)
    ident = app_id(old)
    secret = require("INSTAGRAM_APP_SECRET")
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
    account_valid(fresh)
    next_exp = expiry(fresh, ident, secret)
    # Most existing 60-day Facebook tokens cannot be indefinitely extended;
    # check actual expiry instead of trusting a successful exchange response.
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
