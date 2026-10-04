---
Module: Jarvis
Purpose: Cognitive Business Rules, Sacred Laws, and Operational Guardrails
Last Updated: 2026-09-08
---

# J.A.R.V.I.S. Cognitive Business Rules & Operating Principles

## 1. Sacred Architectural Laws (Zero-Tolerance)

### RULE-JARVIS-001: Sacred Law 9 — Epistemic Gap & Zero String Hardcoding
* **Formula / Mandate**: J.A.R.V.I.S. is a self-evolving Neuro-Symbolic Cognitive Brain, NOT a static chatbot or hardcoded string template system. NEVER write ad-hoc string concatenation or heuristic text stitching (`narrative.push(...)`, `sample.join(...)`, `You have X unread...`) in application tools or realizers.
* **Execution**: When J.A.R.V.I.S. encounters an unknown vocabulary, intention, or novel multi-document synthesis task that it has not yet learned, it delegates the epistemic gap to the LLM Teacher. The teacher's response is immediately ingested into MongoDB Global Brain (`jarvis_memories`) and Knowledge Graph (`jarvis_relationships`) by `LearningAnalyst` to expand J.A.R.V.I.S.'s internal cognitive representation. All subsequent interactions resolve strictly from J.A.R.V.I.S.'s own internal brain in 0 API tokens (<5ms).
* **Validation**: Backend-only (`LearningAnalyst.js`, `EpistemicGapAnalyzer.js`).
* **Edge Cases**: Empty or malformed LLM Teacher responses are caught in `Verifier.js` and prevented from corrupting MongoDB memory stores.

---

### RULE-JARVIS-002: Offline Reflex Precedence (0-Token <5ms Resolution)
* **Formula / Mandate**: If an entity, directional relationship, or procedural blueprint exists in `RelationshipGraph` or `JarvisMemory`, J.A.R.V.I.S. MUST execute and respond locally without dispatching requests to external LLMs.
* **Implementation**: [`stages/IntentClassifier.js:65-110`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/IntentClassifier.js#L65-L110) & [`reasoning/GraphReasoner.js:52-120`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/GraphReasoner.js#L52-L120).
* **Validation**: Backend-only.
* **Metrics**: Sets `ctx.offlineResolved = true` and `latencyMs < 5ms`.

---

### RULE-JARVIS-003: Multi-Hop Beam Search Traversal Hyperparameters
* **Formula / Mandate**: Graph traversal across directional edges must obey bounded parameters to prevent graph explosion while maximizing retrieval recall:
  * `MAX_HOPS = 8`: Maximum path distance from anchor to target.
  * `BEAM_WIDTH = 16`: Top candidate paths retained at each hop.
  * `MIN_PATH_CONFIDENCE = 0.20`: Pruning threshold below which paths are discarded.
  * `HOP_DECAY_FACTOR = 0.96`: Mathematical decay applied per traversal hop ($C_{hop} = C_{prev} \times 0.96 \times W_{edge}$).
  * `TARGET_MATCH_WEIGHT = 2.5`: Multiplicative bonus when reaching target taxonomic type.
  * `TARGET_MISMATCH_WEIGHT = 0.4`: Penalty for navigating towards orthogonal taxonomic types.
* **Implementation**: [`reasoning/GraphReasoner.js:10-20`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/GraphReasoner.js#L10-L20).
* **Cycle Prevention**: Bounded visited set per search branch; returns confidence 0 if cycle is encountered.

---

### RULE-JARVIS-004: Transactional Tool Confirmation Gates
* **Formula / Mandate**: Any tool classified with risk level `medium` or `high` (e.g. `notifications.batchApprove`, `hrms.applyLeave`) MUST require explicit caller confirmation (`requiresConfirmation: true`) before mutating database state.
* **Implementation**: [`stages/PolicyEngine.js:25-50`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/PolicyEngine.js#L25-L50) and [`tools/ToolRegistry.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/ToolRegistry.js).
* **Validation**: Both Frontend (modal prompt in `JarvisChatInterface.jsx`) and Backend (`PolicyEngine.js` blocks unconfirmed calls).
* **Edge Cases**: Direct calls to `POST /api/jarvis/execute` require `confirmed: true` flag in the invocation context.

---

### RULE-JARVIS-005: Delta-Only AdamW Neural Gradient Distillation
* **Formula / Mandate**: Incremental training of the micro-neural transformer weights (`JarvisNeuralCore.js`) must strictly evaluate and train on **newly acquired facts** (`DatasetDistiller.distillDelta()`), bypassing static baseline knowledge.
* **Implementation**: [`neural/DatasetDistiller.js:45-80`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/DatasetDistiller.js#L45-L80) & [`routes/jarvisRoutes.js:287-342`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L287-L342).
* **Guarantees**: If 0 new facts have been learned since the last step ($t$), the system returns immediately with 0 delta steps and 0% CPU consumption.
* **Max Epochs**: Capped at 5 epochs for delta distillation and 10 epochs for full consolidation, with gradients clipped at $[-1.0, 1.0]$.
