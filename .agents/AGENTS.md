# Rule: Scalable Anti-Hardcode Architecture & No Temporary Patches

## Purpose
Enforces long-term platform stability over quick temporary patches across all backend and frontend tasks.

## Behavioral Requirements
1. **Never Propose or Implement Temporary Patches**: Never add quick string comparisons, hardcoded IDs, or ad-hoc if-clauses to fix a single symptom.
2. **Always Analyze Root Cause & Scalability First**: Before writing any code, analyze the underlying architecture to find the most scalable, robust, anti-hardcode solution.
3. **Schema Single Source of Truth**: Security capabilities, role permissions, and access controls MUST be governed strictly by database schema flags (e.g. `Role.isSuperAdmin` boolean property), dynamic access policies, or environment configurations — NEVER hardcoded string titles or hardcoded ObjectIds.
4. **Clean Policy Execution**: In policy validation and engine layers, if `user.isSuperAdmin` (or `roleMeta.isSuperAdmin`) is `true`, immediately bypass policy checks cleanly. Otherwise, evaluate the policy rules cleanly without redundant role-id matching or string heuristics.
