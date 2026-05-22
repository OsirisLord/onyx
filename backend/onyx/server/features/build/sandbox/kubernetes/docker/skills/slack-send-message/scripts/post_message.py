#!/usr/bin/env python3
"""Post a message to a Slack channel via chat.postMessage.

Reads the user's Slack token from the SLACK_USER_TOKEN env var (injected
by the sandbox manager). Designed to be small and dependency-light — uses
only requests, which is preinstalled in the sandbox image.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import requests

SLACK_API = "https://slack.com/api/chat.postMessage"


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a Slack message.")
    parser.add_argument(
        "--channel",
        required=True,
        help="Channel ID (Cxxxx), #channel-name, or user ID (Uxxxx) for a DM.",
    )
    parser.add_argument("--text", required=True, help="Message body.")
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

    resp = requests.post(
        SLACK_API,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        json={"channel": args.channel, "text": args.text},
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

    print(
        json.dumps({"ok": True, "ts": body.get("ts"), "channel": body.get("channel")})
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
