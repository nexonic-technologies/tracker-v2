---
description: Query GitHub and local data to generate sprint progress report
version: 1.0
last_updated: 2026-06-01
---

# Sprint Status Workflow

> **Purpose**: Generate real-time sprint progress report.

## Steps

1. Load config → extract repo info
2. Query GitHub Issues by milestone
3. Read local Active Bugs
4. Generate Sprint Report with counts by status
5. Present report

## Report Format

```
# Sprint Status Report — {DATE}

| Sprint | Total | Done | In Progress | Blocked | % Complete |
|---|---|---|---|---|---|
| Sprint 1 (P0) | {N} | {N} | {N} | {N} | {N}% |
| Sprint 2 (P1) | {N} | {N} | {N} | {N} | {N}% |
| Sprint 3 (P2) | {N} | {N} | {N} | {N} | {N}% |
```
