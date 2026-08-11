---
description: Index of all workflows available for the Workhub ERP Tracker Agent System
---

# Workflow Index

> 21 workflows for React + Vite + Node.js/Express + MongoDB tech stack. Use the slash command to run any workflow.

## Setup (One-Time)

| # | Slash Command | Purpose |
| --- | --- | --- |
| 1 | `/setup-new-client` | Set up bug remediation for a new client project |
| 2 | `/setup-existing-client` | Set up bug remediation for an existing client |
| 3 | `/sync-brain` | Sync copied brains from source to match client code |

## Build → Audit → Triage (Per Module)

| # | Slash Command | Purpose |
| --- | --- | --- |
| 4 | `/build-module-brain` | Build knowledge base for a module based on coverage till 100% (min: 6/10 rounds) |
| 5 | `/manage-bug-patterns` | Initialize or update the pattern library |
| 6 | `/module-bug-audit` | Find all bugs in a module (6 rounds) |
| 7 | `/bug-intake-triage` | Classify a bug → severity, track, sprint |

## Cross-Module (After 3+ Module Brains)

| # | Slash Command | Purpose |
| --- | --- | --- |
| 8 | `/build-system-brain` | Build cross-module _SYSTEM/ brain — shared collections, dependencies, integration points |

## Fix → Test → Learn (Per Bug)

| # | Slash Command | Purpose |
| --- | --- | --- |
| 9 | `/fix-single-bug` | Fix hub — routes to architecture or business fix |
| 10 | `/fix-architecture-bug` | Fix Track A (system) bugs — AI-led |
| 11 | `/fix-business-bug` | Fix Track B (business) bugs — human validates |
| 12 | `/test-and-verify` | Run tests + smoke test after any fix |
| 13 | `/learn-and-improve` | Update brain, patterns, close bug |
| 14 | `/github-bug-tracking` | Create/update/close GitHub Issues |

## Reporting & Maintenance

| # | Slash Command | Purpose |
| --- | --- | --- |
| 15 | `/sprint-status` | Sprint progress report |
| 16 | `/system-health` | Cross-module risk heatmap |
| 17 | `/overall-bug-dashboard` | Full dashboard with developer attribution |
| 18 | `/validate-workflows` | Self-test workflow consistency |

## Requirements (Support Team)

| # | Slash Command | Purpose |
| --- | --- | --- |
| 19 | `/get-requirement` | Analyze task → generate Category, Task, User Story, Observation, Impacts |
