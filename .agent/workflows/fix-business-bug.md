---
description: Fix Track B (business logic) bugs — human validates business logic before code change
version: 1.0
last_updated: 2026-06-01
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Fix Business Bug Workflow

## Purpose

Fix business logic bugs (Track B) — calculation errors, missing rules, workflow bugs. Human validates business logic BEFORE any code change.

## Steps

### Step 1: State the Business Rule
Before any code, state the violated business rule in plain English.

### Step 2: DB Truth Protocol
Verify actual data in DB matches expectations using Mongoose queries.

### Step 3: Layer-by-Layer Value Trace
Trace the value through: React form → API request → Mongoose Schema → Model → DB.

### Step 4: Present Fix Proposal to Human
Human validates the business logic. Only proceed with code change after approval.

### Step 5: Apply Fix
After business validation, apply the fix.

## Completion
Route back to `/fix-single-bug` Step 7 (Approval Gate).
