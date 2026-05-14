# AGENTS.md

AI assistants should:

1. Read ADRs in `docs/decisions/` before changing trust boundaries or scoring.
2. Keep PTB flows composable; prefer returning objects over transfers-to-sender in new Move APIs.
3. Match MemWal signature scheme `{timestamp}.{method}.{path}.{body_sha256}` when touching relayer clients.

Human reviewers: verify demo scripts exercise every SDK import (ADR-012).
