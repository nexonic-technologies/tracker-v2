---
description: Set up bug remediation for an existing client project (with existing code)
version: 1.0
last_updated: 2026-06-01
---

# Setup Existing Client

> **When to use**: Client project already exists with code but no brain/audit data.

## Steps

1. Copy workflows from source project
2. Copy brain templates (`knowledge_brain/_TEMPLATE/`)
3. Copy system-level knowledge (`_SYSTEM/SHARED_COLLECTIONS.md`, `_SYSTEM/SYSTEM_COVERAGE.md`)
4. Update `.agent/config.md` for client-specific paths
5. Run `/validate-workflows` to auto-detect environment
6. Build module brains (start with buggiest module)
7. Sync brains if copied from another project: `/sync-brain`
