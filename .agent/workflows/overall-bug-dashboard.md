---
description: Full bug dashboard with developer attribution and live GitHub status
version: 1.0
last_updated: 2026-06-01
---

# Overall Bug Dashboard Workflow

> **Purpose**: Single-view dashboard aggregating all bug data with developer attribution.

## Steps

1. Load config
2. Discover all audited modules
3. Collect local bug data
4. Pull live GitHub status
5. Build developer attribution table
6. Generate dashboard report
7. Save report to `knowledge_brain/DASHBOARD_REPORTS/`
8. Present to user

## Dashboard includes:
- Executive Summary (total bugs, fixed, in-progress)
- Module Breakdown with risk scores
- Sprint Progress
- Developer Attribution (who fixed what)
- Active Bugs (in progress)
- Blocked Bugs
- Recently Fixed (last 10)
- Fix Velocity Trend
- Data Inconsistencies (local vs GitHub)
