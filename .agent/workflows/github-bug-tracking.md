---
description: Create/update/close GitHub Issues for bug tracking
version: 1.0
last_updated: 2026-06-01
---

# GitHub Bug Tracking Workflow

## Purpose
Manage GitHub Issues as the single source of truth for bug tracking alongside local audit data.

## Part 1: One-Time Setup
1. Create labels: severity (P0-P3), track (A/B), category, module prefixes
2. Create Sprint 1-4 milestones

## Part 2: Create Issue (from /bug-intake-triage)
1. Title: `[{BUG_ID}] {Bug Title}`
2. Labels: severity, track, category, module
3. Assignee: current developer
4. Body: Bug details from triage

## Part 3: Update Issue (during /fix-single-bug)
Update labels as bug progresses: `status:triaged` → `status:in-progress` → `status:testing`

## Part 4: Close Issue (from /learn-and-improve)
1. Add close comment with fix summary
2. Close issue with `state_reason: completed`

## Platform Dispatch
Uses GitHub MCP server or git CLI as fallback.
