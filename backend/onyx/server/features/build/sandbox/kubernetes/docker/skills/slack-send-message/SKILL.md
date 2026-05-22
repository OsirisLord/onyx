---
name: slack-send-message
description: "Send a message to a Slack channel or list the user's channels. Use this when the user asks to post, share, send, or notify in Slack — for example 'tell the team in #general' or 'send this to my engineering channel'. If the user's intent is ambiguous about the destination, list channels first and confirm. The skill never decides on its own which channel to post to."
---

# Slack: Send Message

Posts to `chat.postMessage` as the authenticated user. The user's Slack
access token is provided by the sandbox runtime as `SLACK_USER_TOKEN`
— you don't need to handle authentication yourself.

## Listing channels

Run this first when you don't know the channel ID or the user said
something ambiguous like "the engineering channel":

```bash
python .opencode/skills/slack-send-message/scripts/list_channels.py
```

Output: JSON with `{ok, channels: [{id, name, is_private, is_member, is_archived}]}`.
Filter to channels where `is_member: true` — posting to channels the
user isn't in returns `not_in_channel`.

## Sending a message

```bash
python .opencode/skills/slack-send-message/scripts/post_message.py \
  --channel "#general" \
  --text "Hey team — quick update on the migration."
```

Channel can be a channel ID (`C012ABCDE`) or a name prefixed with `#`
(`#general`). For DMs, use the user ID (`U012ABCDE`) or pre-resolved DM
channel ID.

## Arguments

`post_message.py`:

| Argument | Required | Description |
|----------|----------|-------------|
| `--channel` | yes | Channel ID, channel name with leading `#`, or user ID for DMs |
| `--text` | yes | Message body. Slack mrkdwn supported (`*bold*`, `_italic_`, `<@U…>`). |

`list_channels.py`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--types` | no | `public_channel,private_channel` | Comma-separated: `public_channel`, `private_channel`, `mpim`, `im`. |
| `--limit` | no | `200` | Page size (Slack max 1000). The script paginates and returns all channels. |
| `--include-archived` | no | off | Include archived channels. |

## Exit codes

Both scripts:

- `0` — Slack returned `ok: true`.
- `1` — Slack returned `ok: false` (rate limit, missing scope, bad channel, etc.). The response JSON is printed to stderr so you can read the `error` field.
- `2` — argument or environment problem (e.g. `SLACK_USER_TOKEN` not set).

## Notes

- The script does **not** invent channel names. If the user didn't specify a channel, list and ask.
- Outbound traffic to `slack.com` is gated by the sandbox egress proxy. For `post_message.py` the user sees an in-chat approval card and must approve before the request actually reaches Slack — that's expected. Don't retry on a "blocked" timeout; let the user retry by approving again. `list_channels.py` is read-only and not gated.
