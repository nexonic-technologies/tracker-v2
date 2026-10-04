---
Module: Jarvis
Purpose: End-to-End Data Flow Traces and Frontend React Component to API Map
Last Updated: 2026-09-08
---

# J.A.R.V.I.S. Data Flow & Dynamic API Trace

## 1. Primary Cognitive & Transactional Flows

### Flow 1: Offline Graph Reflex & Multi-Hop Traversal (<5ms, 0 API Tokens)

```
User Utterance: "What is the capital of India?"
  │
  ▼
1. Browser / React: JarvisChatInterface.jsx (L45-80) submits payload:
   POST /api/jarvis/chat { utterance, sessionId }
  │
  ▼
2. Route Handler: jarvisRoutes.js (L12-46) delegates to JarvisCore.handle(ctx)
  │
  ▼
3. Stage 1 (Context Enrichment): ContextManager.js (L15-40) attaches employeeId, tenantSlug, and active permissions.
  │
  ▼
4. Stage 2 (Discourse & Retrieval): MemoryStore.js (L18-50) loads active discourse entities from ConversationContextTracker.js.
  │
  ▼
5. Stage 3 (Intent Classification & Multi-Hop Graph Reasoner):
   - SemanticQueryParser.js (L25-95) recognizes Anchor: "India" (ID: 101) and Target: "capital" (Concept: 103).
   - GraphReasoner.js (L52-120) runs _searchMultiHopPaths with beam width 16.
   - Discovers direct or multi-hop path: (India) ──[has_capital]──► (New Delhi) with confidence 1.0.
   - ctx.offlineResolved = true; ctx.semanticFact = { subject: "India", relation: "has_capital", target: "New Delhi" }.
  │
  ▼
6. Stage 7 (Response Generator): ResponseGenerator.js (L22-65) formats fact into natural language response without LLM API call.
  │
  ▼
7. Trace & Session Persistence:
   - TraceStore.js (L20-55) asynchronously persists execution metrics into `jarvis_traces`.
   - ConversationContextTracker.js (L75-140) updates `jarvis_chat_sessions` discourse state.
  │
  ▼
8. Response to UI: { success: true, response: "The capital of India is New Delhi.", offlineResolved: true }
   - JarvisChatInterface.jsx displays ⚡ 0-Token Offline badge in <5ms.
```

---

### Flow 2: Epistemic Gap Detection & LLM Teacher Assimilation (Sacred Law 9)

```
User Utterance: "How do I configure overtime approval in attendance service?"
  │
  ▼
1. IntentClassifier.js detects no matching path in local RelationshipGraph.
  │
  ▼
2. EpistemicGapAnalyzer.js flags epistemic gap: concept understood, but procedural recipe missing.
  │
  ▼
3. ResponseGenerator.js delegates to LLMManager.js (Teacher LLM).
   - Generates authoritative engineering response referencing attendance.service.js, hooks, and ABAC policies.
  │
  ▼
4. Post-Response Learning Stage: LearningAnalyst.js (L32-110) initiates Bidirectional Harvesting:
   - Token Harvester: Extracts new tokens ("overtime approval", "attendance.service.js") into `jarvis_tokens`.
   - Triplet Harvester: Adds directed edges into `jarvis_relationships`.
   - Memory Harvester: Distills procedural blueprint into `jarvis_memories` (type: PATTERN_PROCEDURE).
  │
  ▼
5. Permanent Assimilation:
   - All subsequent queries regarding overtime approval resolve offline from J.A.R.V.I.S.'s internal memory in <5ms.
```

---

### Flow 3: AI Notification Digest & Transactional Batch Approval

```
User visits Dashboard or opens JarvisNotificationDigest.jsx (L20-75)
  │
  ▼
1. Frontend calls jarvisService.getNotificationDigest() -> POST /api/jarvis/notifications/digest
  │
  ▼
2. jarvisRoutes.js (L81-101) invokes notificationTools.getDigest:
   - Queries `notification_receptionists` collection for active unread items where receiver = employeeId.
   - Populates `notificationId` and sender profile.
   - NeuralResponseRealizer.realizeDigest crafts concise summary: "You have 2 pending leave approvals from yesterday."
  │
  ▼
3. UI renders action items with "Approve" button.
  │
  ▼
4. User clicks "Approve":
   - Confirmation Modal displays tool risk assessment (Medium Risk).
   - User confirms -> calls POST /api/jarvis/execute with { tool: "notifications.batchApprove", params: { type: "leave", entityId } }.
  │
  ▼
5. PolicyEngine.js verifies user has permission to approve leaves.
  │
  ▼
6. notificationTools.batchApprove updates `leaves` collection status to "Approved" and marks receptionist record as read.
```

---

### Flow 4: Daily Standup Summarization & Git Milestone Compilation

```
User opens JarvisFeedSummarizer.jsx (L25-85)
  │
  ▼
1. Frontend fetches logged activities from `daily_activities` and local Git commits for the selected date.
  │
  ▼
2. Calls POST /api/jarvis/summarize with { employeeName, date, activities, commits }
  │
  ▼
3. summarizerTools.generateDailySummary (L6-60) structures input and prompts LLM Teacher:
   - Groups items into: Key Accomplishments, Client Progress, Code Milestones, Next Steps.
  │
  ▼
4. Response returns formatted Markdown Standup ready for one-click copy into Slack or Email.
```

---

### Flow 5: Delta-Only AdamW Gradient Distillation & Neural Training

```
Admin navigates to JarvisTrainingStudio.jsx (L30-95) and clicks "Train Micro-Neural Core"
  │
  ▼
1. Frontend calls POST /api/jarvis/train with { full: false }
  │
  ▼
2. jarvisRoutes.js (L287-342) delegates to DatasetDistiller.distillDelta():
   - Extracts ONLY newly ingested triples since last training step (t).
   - If 0 new facts: Returns 0 delta steps required (0% CPU overhead).
  │
  ▼
3. If new facts exist:
   - JarvisTokenizer.encode tokenizes prompt-target pairs.
   - CapacityGovernor.evaluateLoss calculates baseline loss.
   - Runs 5 fast AdamW gradient update steps on JarvisNeuralCore weights (<10ms).
   - CapacityGovernor calculates final loss and records delta.
   - JarvisNeuralCore.saveCheckpoint() writes updated weights to disk checkpoint.
  │
  ▼
4. Response returns: { success: true, trainPairs, initialLoss, finalLoss, delta, step }.
   - JarvisTelemetryHeader refreshes parameter metrics in real-time.
```

---

## 2. Frontend Component → Dynamic API Map

| React Component | Source Lines | API Method & Endpoint | Payload Structure | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `JarvisChatInterface.jsx` | [`L45-L95`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisChatInterface.jsx#L45-L95) | `POST /api/jarvis/chat` | `{ utterance: string, sessionId?: string, conversationHistory?: array }` | Interactive conversation, offline fact queries, and action planning |
| `JarvisChatInterface.jsx` | [`L120-L155`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisChatInterface.jsx#L120-L155) | `POST /api/jarvis/execute` | `{ tool: string, params: object }` | Confirms and executes planned transactional actions |
| `JarvisNotificationDigest.jsx` | [`L25-L60`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisNotificationDigest.jsx#L25-L60) | `POST /api/jarvis/notifications/digest` | `{}` | Loads pending leaves and regularizations with AI headline |
| `JarvisNotificationDigest.jsx` | [`L75-L110`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisNotificationDigest.jsx#L75-L110) | `POST /api/jarvis/execute` | `{ tool: "notifications.batchApprove", params: { type, entityId, receptionId } }` | One-click approval of pending request |
| `JarvisFeedSummarizer.jsx` | [`L30-L75`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisFeedSummarizer.jsx#L30-L75) | `POST /api/jarvis/summarize` | `{ employeeName, date, activities, commits }` | Generates structured standup summary from activities and git commits |
| `JarvisTicketAssist.jsx` | [`L35-L80`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTicketAssist.jsx#L35-L80) | `POST /api/jarvis/ticket-assist` | `{ rawTitle, rawDescription, priority, client, category }` | Refines raw notes into professional Agile ticket description |
| `JarvisChatCatchup.jsx` | [`L20-L55`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisChatCatchup.jsx#L20-L55) | `POST /api/jarvis/messages/summarize` | `{ conversationId, limit: 30 }` | Summarizes unread messages in group conversation |
| `JarvisTelemetryHeader.jsx` | [`L20-L45`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTelemetryHeader.jsx#L20-L45) | `GET /api/jarvis/stats` | None | Polls telemetry counts (tokens, edges, neural step) |
| `JarvisKnowledgeExplorer.jsx` | [`L30-L65`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisKnowledgeExplorer.jsx#L30-L65) | `GET /api/jarvis/tokens` | None | Fetches all registered tokens in knowledge brain |
| `JarvisKnowledgeExplorer.jsx` | [`L70-L105`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisKnowledgeExplorer.jsx#L70-L105) | `GET /api/jarvis/graph` | None | Fetches all relational edges for graph browser |
| `JarvisTrainingStudio.jsx` | [`L25-L60`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTrainingStudio.jsx#L25-L60) | `POST /api/jarvis/train-system` | None | Ingests entire ERP module registry into Knowledge Graph |
| `JarvisTrainingStudio.jsx` | [`L65-L100`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTrainingStudio.jsx#L65-L100) | `POST /api/jarvis/train` | `{ full: boolean }` | Triggers micro-neural delta AdamW backpropagation step |
| `JarvisTrainingStudio.jsx` | [`L105-L145`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTrainingStudio.jsx#L105-L145) | `POST /api/jarvis/teach` | `{ subject, relation, object }` or `{ utterance }` | Direct manual fact teaching into knowledge brain |
