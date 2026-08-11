# Travel-Expenses Module Brain

## Overview
This module contains 1 model (Expense), 0 services, and 1 frontend file.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Expense | Expense.js | 53 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by status_configs (`modelName: 'expenses'`). Refs: employees, clients. |

> **Dynamic status (as of 2026-06-10)**: `enum: ["pending","approved","rejected"]` removed. Status values now from `status_configss.workflowStatuses`. `metaStatus` added (default: `'active'`).

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| index.jsx | POST | /populate/read/clients | clients |

