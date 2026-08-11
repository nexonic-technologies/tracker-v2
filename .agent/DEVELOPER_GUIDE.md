# Developer Guide — Workhub ERP Tracker Agent System

## Overview

This `.agent/` directory contains the AI-assisted development system for the **Workhub ERP Tracker** project. Built for the **React + Vite + Express + MongoDB** tech stack.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + JavaScript + Vite 7 |
| UI | Tailwind CSS 4 + MUI 7 + custom `tokens.css` |
| Backend | Express 5 + Mongoose 8 |
| Database | MongoDB 6 |
| Auth | JWT + bcryptjs |
| WebSocket | Socket.io 4 |
| Queue | Bull + Redis |
| Cache | Redis |
| Push | Firebase Cloud Messaging |

## Quick Start

1. **First time?** Run `/validate-workflows` to auto-detect your environment
2. **Build a brain**: `/build-module-brain {MODULE_NAME}`
3. **Audit a module**: `/module-bug-audit {MODULE_NAME}`
4. **Fix a bug**: `/fix-single-bug`

## Directory Structure

```
.agent/
├── Claude.md              ← Project rules (read first in every conversation)
├── config.md              ← Central config (paths, module registry, variables)
├── DEVELOPER_GUIDE.md     ← This file
├── .env.example           ← Environment template (copy to .env)
├── skills/                ← Reusable skill modules
│   ├── knowledge-brain/   ← Brain maintenance: SKILL.md, design-tokens.md, reference.md
│   └── frontend-ui-tokens/← UI token enforcement: SKILL.md
└── workflows/             ← Workflow definitions
    ├── 00-INDEX.md        ← Workflow index
    ├── fix-single-bug.md
    ├── test-and-verify.md
    ├── build-module-brain.md
    └── ... (21 total)
```

## Key Workflows

| Command | Purpose |
|---------|---------|
| `/build-module-brain` | Build knowledge base for a Mongoose model + React module |
| `/fix-single-bug` | Fix ONE bug with full traceability |
| `/test-and-verify` | Run lint + Node.js checks + test verification |
| `/bug-intake-triage` | Classify and prioritize a new bug |
| `/get-requirement` | Generate structured requirement from task description |
| `/validate-workflows` | Auto-setup environment + self-test |

## Module Registry

See `config.md` for the full module registry mapping Mongoose models to React pages/components.

## Skills

| Skill | Location | When to use |
|-------|----------|-------------|
| Knowledge Brain | `.agent/skills/knowledge-brain/SKILL.md` | Every task — pre-read + post-write brain maintenance |
| Frontend UI Tokens | `.agent/skills/frontend-ui-tokens/SKILL.md` | Any UI/styling task — theme-aware + responsive enforcement |

## Adapted From

This system was adapted from a Django/MySQL agent system to work with the Express/MongoDB tech stack.
