---
description: Sync copied brains from source to match client code
version: 1.0
last_updated: 2026-06-01
---

# Sync Brain Workflow

> **Purpose**: After copying brains from a source project, verify and update them to match client-specific code.

## Steps

1. Read copied Module Brain
2. Scan client's actual code (Node.js/Express app + React components)
3. Compare: methods, endpoints, tables
4. Add new items found in client code but not in brain
5. Flag items in brain but not in client code as `⚠️ NOT IN THIS CLIENT`
6. Update line numbers
7. Mark as `DERIVED BRAIN` with source attribution
