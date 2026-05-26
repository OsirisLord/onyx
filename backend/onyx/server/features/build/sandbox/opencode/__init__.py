"""HTTP client for the long-lived ``opencode serve`` process inside the
sandbox pod / container. The only transport Onyx Craft uses to drive
in-sandbox agent turns.

Public surface: :class:`OpencodeServeClient`.
"""

from onyx.server.features.build.sandbox.opencode.serve_client import ClientTimeouts
from onyx.server.features.build.sandbox.opencode.serve_client import OpencodeServeClient

__all__ = ["OpencodeServeClient", "ClientTimeouts"]
