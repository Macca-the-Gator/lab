"""Collect Search Console signals without adding a paid analytics service."""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get("SEARCH_CONSOLE_FILE", ROOT / "blog" / "search-console.json"))
SITE = os.environ.get("SEARCH_CONSOLE_SITE_URL", "https://macca-lab.onrender.com/")
SCOPES = "https://www.googleapis.com/auth/webmasters.readonly"

STOP = {
    "the","and","for","with","from","this","that","what","when","where","will","does",
    "gta","grand","theft","auto","rockstar","games","game","macca","blog","news",
    "about","into","after","before","your","you","are","was","were","has","have","had",
}


def post_form(url: str, payload: dict) -> dict:
    data = urllib.parse.urlencode(payload).encode()
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode())


def post_json(url: str, payload: dict, token: str) -> dict:
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def refresh_access_token() -> str:
    client_id = os.environ.get("SEARCH_CONSOLE_CLIENT_ID") or os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("SEARCH_CONSOLE_CLIENT_SECRET") or os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("SEARCH_CONSOLE_REFRESH_TOKEN") or os.environ.get("YOUTUBE_ANALYTICS_REFRESH_TOKEN")
    if not (client_id and client_secret and refresh_token):
        raise RuntimeError(
            "Search Console collection is disabled until SEARCH_CONSOLE_REFRESH_TOKEN is configured (the existing YouTube Analytics token is also tried when it already includes this scope)."
        )
    response = post_form(
        "https://oauth2.googleapis.com/token",
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    token = response.get("access_token")
    if not token:
        raise RuntimeError("Google did not return a Search Console access token.")
    return token


def query_report(token: str, search_type: str, start_date: str, end_date: str) -> list[dict]:
    site = urllib.parse.quote(SITE, safe="")
    result = post_json(
        f"https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query",
        {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": ["query", "page"],
            "type": search_type,
            "rowLimit": 2500,
            "dataState": "final",
        },
        token,
    )
    rows = []
    for row in result.get("rows") or []:
        keys = row.get("keys") or []
        if len(keys) < 2:
            continue
        rows.append(
            {
                "query": keys[0],
                "page": keys[1],
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
                "ctr": row.get("ctr", 0),
                "position": row.get("position", 0),
                "type": search_type,
            }
        )
    return rows


def tokens(query: str) -> list[str]:
    values = re.findall(r"[a-z0-9][a-z0-9-]{2,}", query.lower())
    return [value for value in values if value not in STOP and not value.isdigit()]


def build_signals(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    signals = defaultdict(lambda: {"weight": 0.0, "impressions": 0.0, "clicks": 0.0})
    pages = defaultdict(lambda: {"impressions": 0.0, "clicks": 0.0, "weightedPosition": 0.0, "queries": []})

    for row in rows:
        impressions = float(row.get("impressions") or 0)
        clicks = float(row.get("clicks") or 0)
        ctr = float(row.get("ctr") or 0)
        position = float(row.get("position") or 0)
        if impressions <= 0:
            continue

        page = pages[row["page"]]
        page["impressions"] += impressions
        page["clicks"] += clicks
        page["weightedPosition"] += position * impressions
        if len(page["queries"]) < 12:
            page["queries"].append(row["query"])

        # Reward topics already earning demand and topics close enough to page 1
        # to benefit from additional internally-linked coverage.
        opportunity = 0.0
        if 3 <= position <= 15 and impressions >= 10:
            opportunity += min(1.4, 0.25 + impressions / 250)
        if position <= 8 and ctr >= 0.03:
            opportunity += min(0.8, ctr * 6)
        if impressions >= 50 and ctr < 0.015 and position <= 15:
            opportunity += 0.45

        for term in set(tokens(row["query"])):
            item = signals[term]
            item["weight"] += opportunity
            item["impressions"] += impressions
            item["clicks"] += clicks

    topic_signals = [
        {
            "term": term,
            "weight": round(max(-1.0, min(1.5, values["weight"])), 3),
            "impressions": round(values["impressions"], 1),
            "clicks": round(values["clicks"], 1),
        }
        for term, values in signals.items()
        if values["impressions"] >= 10 and values["weight"] > 0
    ]
    topic_signals.sort(key=lambda item: (item["weight"], item["impressions"]), reverse=True)

    page_opportunities = []
    for page, values in pages.items():
        impressions = values["impressions"]
        if impressions < 20:
            continue
        clicks = values["clicks"]
        position = values["weightedPosition"] / impressions if impressions else 0
        ctr = clicks / impressions if impressions else 0
        if 3 <= position <= 15 or (impressions >= 50 and ctr < 0.015):
            page_opportunities.append(
                {
                    "page": page,
                    "impressions": round(impressions, 1),
                    "clicks": round(clicks, 1),
                    "ctr": round(ctr, 5),
                    "position": round(position, 2),
                    "queries": values["queries"][:8],
                }
            )
    page_opportunities.sort(key=lambda item: item["impressions"], reverse=True)
    return topic_signals[:80], page_opportunities[:80]


def main() -> None:
    try:
        token = refresh_access_token()
    except RuntimeError as exc:
        print(str(exc))
        return

    end = datetime.now(timezone.utc).date() - timedelta(days=2)
    start = end - timedelta(days=27)
    all_rows = []
    successful_sources = 0
    for search_type in ("web", "discover", "googleNews"):
        try:
            rows = query_report(token, search_type, start.isoformat(), end.isoformat())
            all_rows.extend(rows)
            successful_sources += 1
            print(f"Search Console {search_type}: {len(rows)} row(s).")
        except Exception as exc:
            print(f"Search Console {search_type} unavailable: {type(exc).__name__}: {exc}")

    if successful_sources == 0:
        print("All Search Console queries failed; retaining previous results instead of overwriting them.")
        return

    topic_signals, page_opportunities = build_signals(all_rows)
    output = {
        "schemaVersion": 1,
        "site": SITE,
        "scope": SCOPES,
        "collectedAt": datetime.now(timezone.utc).isoformat(),
        "period": {"startDate": start.isoformat(), "endDate": end.isoformat()},
        "rows": all_rows,
        "topicSignals": topic_signals,
        "pageOpportunities": page_opportunities,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Saved {len(all_rows)} Search Console rows, "
        f"{len(topic_signals)} topic signals and {len(page_opportunities)} page opportunities."
    )


if __name__ == "__main__":
    main()
