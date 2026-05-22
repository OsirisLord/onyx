#!/usr/bin/env python3
"""List Slack channels visible to the authenticated user.

Useful before calling post_message.py — channel names like "#general"
can be ambiguous across workspaces, and Slack rejects unknown channels
with `channel_not_found`. Listing first lets the agent resolve the
correct ID and confirm it with the user.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import requests

SLACK_API = "https://slack.com/api/conversations.list"


def main() -> int:
    parser = argparse.ArgumentParser(description="List Slack channels.")
    parser.add_argument(
        "--types",
        default="public_channel,private_channel",
        help="Comma-separated channel types: public_channel,private_channel,mpim,im (default: public+private).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Max channels per page (Slack caps at 1000; default 200).",
    )
    parser.add_argument(
        "--include-archived",
        action="store_true",
        help="Include archived channels in the result.",
    )
    args = parser.parse_args()

    token = os.environ.get("SLACK_USER_TOKEN")
    if not token:
        print(
            "SLACK_USER_TOKEN not set in this sandbox — the user hasn't "
            "connected Slack, or the sandbox was provisioned before the "
            "connection was added.",
            file=sys.stderr,
        )
        return 2

    channels: list[dict[str, object]] = []
    cursor: str | None = None
    while True:
        params: dict[str, str] = {
            "types": args.types,
            "limit": str(args.limit),
            "exclude_archived": "false" if args.include_archived else "true",
        }
        if cursor:
            params["cursor"] = cursor

        resp = requests.get(
            SLACK_API,
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=30,
        )

        try:
            body = resp.json()
        except ValueError:
            print(
                f"Slack returned non-JSON ({resp.status_code}): {resp.text}",
                file=sys.stderr,
            )
            return 1

        if not body.get("ok"):
            print(json.dumps(body), file=sys.stderr)
            return 1

        for ch in body.get("channels", []) or []:
            channels.append(
                {
                    "id": ch.get("id"),
                    "name": ch.get("name"),
                    "is_private": ch.get("is_private", False),
                    "is_member": ch.get("is_member", False),
                    "is_archived": ch.get("is_archived", False),
                }
            )

        cursor = (body.get("response_metadata") or {}).get("next_cursor") or None
        if not cursor:
            break

    print(json.dumps({"ok": True, "channels": channels}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
