---
Module: Jarvis
Architecture: Neurosymbolic Cognitive Brain & Autonomous Self-Evolution Engine
Backend Root: Backend/src/jarvis/
Frontend Root: Frontend/src/components/Jarvis/
Last Updated: 2026-09-08
Status: IMPLEMENTED
Compliance: Sacred Law 9 (Epistemic Gap & Zero String Hardcoding), Sacred Law 1-5 (No Hardcoded Access)
---

# J.A.R.V.I.S. Module Brain

## 1. Executive Architectural Overview

J.A.R.V.I.S. (Joint Autonomous Real-time Venture & Intelligence System) is a **Neurosymbolic Cognitive Brain** deeply embedded into Workhub ERP Tracker. Unlike static chatbots or rigid regex matchers, J.A.R.V.I.S. maintains an evolving, graph-grounded cognitive state in Global MongoDB.

### Core Philosophy
1. **Teacher-Bootstrapped Assimilation**: The external LLM serves as a **Master Teacher, Code Generator, and Reasoning Mentor**.
2. **Offline Reflex Precedence (0-Token <5ms)**: Once concepts, entities, directional relationships, and execution procedures are assimilated into J.A.R.V.I.S.'s memory and knowledge graph, they execute directly, deterministically, and offline without external LLM API calls.
3. **Epistemic Gap Resolution (Sacred Law 9)**: When encountering unknown vocabulary, novel synthesis requirements, or missing factual edges, J.A.R.V.I.S. autonomously dispatches discovery tools or queries the LLM Teacher. The resulting factual triples, tokens, and procedural recipes are harvested bidirectional by `LearningAnalyst` and stored permanently into MongoDB.
4. **Inspectable Micro-Neural Distillation (SGLM)**: Embeds a Small Graph Language Model (`sglm/`) with transparent attention matrices and AdamW delta-only gradient distillation to consolidate cognitive memory with minimal CPU/GPU overhead.

```
                      ┌───────────────────────────────────────────────┐
                      │            NATURAL LANGUAGE STREAM            │
                      │  (User Utterance + LLM Response + Artifacts)  │
                      └───────────────────────┬───────────────────────┘
                                              │
                 ┌────────────────────────────┼────────────────────────────┐
                 ▼                            ▼                            ▼
    ╔═════════════════════════╗  ╔═════════════════════════╗  ╔═════════════════════════╗
    ║       JarvisToken       ║  ║   JarvisRelationship    ║  ║      JarvisMemory       ║
    ║   (Concepts & Synonyms) ║  ║  (Graph Triples & Facts)║  ║  (Procedures & Actions) ║
    ╠═════════════════════════╣  ╠═════════════════════════╣  ╠═════════════════════════╣
    ║ Stores normalized words ║  ║ Stores directed factual ║  ║ Stores execution rules, ║
    ║ and entity aliases:     ║  ║ edges between tokens:   ║  ║ tool recipes, templates:║
    ║ • "India"    -> ID 101  ║  ║ • (101: India)          ║  ║ • Math calculation code ║
    ║ • "Bharat"   -> ID 101  ║  ║      │                  ║  ║ • Ticket layout recipes ║
    ║ • "Capital"  -> ID 103  ║  ║   [has_capital]         ║  ║ • Leave approval steps  ║
    ║ • "Delhi"    -> ID 102  ║  ║      ▼                  ║  ║ • Parametric slots      ║
    ║ • "policyEngine"->ID 201║  ║   (102: Delhi)          ║  ║ • ABAC decision logic   ║
    ╚═════════════════════════╝  ╚═════════════════════════╝  ╚═════════════════════════╝
```

---

## 2. Directory & Subsystem Map

The J.A.R.V.I.S. engine is organized across modular functional directories under `Backend/src/jarvis/`:

| Subsystem | Directory | Core Purpose & Primary Classes |
| :--- | :--- | :--- |
| **Core Runtime** | [`core/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/) | Pipeline runner ([`JarvisCore.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/JarvisCore.js#L8-L73)), lifecycle state container ([`JarvisContext.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/JarvisContext.js#L1-L60)), plan DAG ([`ExecutionPlan.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/ExecutionPlan.js)), audit recorder ([`TraceStore.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/TraceStore.js#L1-L70)), event publisher ([`EventBus.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/core/EventBus.js)). |
| **Cognitive Stages** | [`stages/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/) | Pipeline execution stages: Context Enrichment ([`ContextManager.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ContextManager.js)), Memory Retrieval ([`MemoryStore.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/MemoryStore.js)), Multi-hop Graph Intent Resolution ([`IntentClassifier.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/IntentClassifier.js)), Task Planning ([`TaskPlanner.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/TaskPlanner.js)), Execution ([`ToolEngine.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ToolEngine.js)), ABAC Policy ([`PolicyEngine.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/PolicyEngine.js)), Verification ([`Verifier.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/Verifier.js)), Response Generation ([`ResponseGenerator.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ResponseGenerator.js)), Bidirectional Harvester ([`LearningAnalyst.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/LearningAnalyst.js)), Discourse Tracking ([`ConversationContextTracker.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ConversationContextTracker.js)). |
| **Token & Graph Engine** | [`tokens/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/) | Dynamic token registration ([`TokenRegistry.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/TokenRegistry.js)), in-memory directed relational graph ([`RelationshipGraph.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/RelationshipGraph.js)), entity canonicalizer & stop-word cleaner ([`EntityCanonicalizer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/EntityCanonicalizer.js)), token tokenizer ([`TokenEngine.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/TokenEngine.js)), token discovery & AI resolving ([`TokenDiscovery.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/TokenDiscovery.js), [`AIResolver.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/AIResolver.js)). |
| **Multi-Hop Reasoning** | [`reasoning/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/) | Multi-Hop Graph Reasoner with beam search & cycle pruning ([`GraphReasoner.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/GraphReasoner.js#L28-L378)), semantic query parsing ([`SemanticQueryParser.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/SemanticQueryParser.js)), ontology relation registry ([`RelationRegistry.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/RelationRegistry.js)), epistemic gap detector ([`EpistemicGapAnalyzer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/EpistemicGapAnalyzer.js)). |
| **SGLM (Small Graph LM)** | [`sglm/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/) | Native neural transformer & memory engine ([`core/SGLMBrain.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/core/SGLMBrain.js)), multi-hop engine ([`core/MultiHopReasoningEngine.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/core/MultiHopReasoningEngine.js)), copy transformer kernels ([`kernel/MultiHeadCopyTransformer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/kernel/MultiHeadCopyTransformer.js), [`kernel/TwoLayerInspectableTransformer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/kernel/TwoLayerInspectableTransformer.js)), AdamW trainer ([`kernel/AnalyticalAdamWTrainer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/kernel/AnalyticalAdamWTrainer.js)), empirical benchmark harness ([`benchmark/ReasoningBenchmarkRunner.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/benchmark/ReasoningBenchmarkRunner.js)). |
| **Neural Core** | [`neural/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/) | Micro-neural core with learned weights ([`JarvisNeuralCore.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/JarvisNeuralCore.js)), character/BPE tokenizer ([`JarvisTokenizer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/JarvisTokenizer.js)), response realization ([`NeuralResponseRealizer.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/NeuralResponseRealizer.js)), delta dataset distillation ([`DatasetDistiller.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/DatasetDistiller.js)), loss governor ([`CapacityGovernor.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/CapacityGovernor.js)), expert spawner ([`ModularExpertSpawner.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/ModularExpertSpawner.js)). |
| **Providers** | [`providers/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/providers/) | Multi-provider LLM connector ([`LLMManager.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/providers/LLMManager.js)), global MongoDB memory store synchronizer ([`MongoBrainMemoryStore.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/providers/MongoBrainMemoryStore.js#L1-L260)). |
| **Built-in Tools** | [`tools/`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/) | Central tool registry ([`ToolRegistry.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/ToolRegistry.js)), HRMS lookup & leave apply ([`hrmsTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/hrmsTools.js)), notification digest & batch approve ([`notificationTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/notificationTools.js)), daily standup generator ([`summarizerTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/summarizerTools.js)), ticket draft assist ([`ticketTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/ticketTools.js)), chat message catchup ([`messageTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/messageTools.js)), math calculation ([`mathTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/mathTools.js)), autonomous browser research ([`browserTools.js`](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/browserTools.js)). |

---

## 3. Database Models (Global MongoDB)

All J.A.R.V.I.S. operational schemas reside in the **Global MongoDB Database** (`tracker_global`) across isolated collections, accessible via `getGlobalModels()`:

| Model Name | Schema Location | Collection | Key Fields | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `JarvisToken` | [`Backend/src/models/global/JarvisToken.js`](file:///e:/Loigmax/tracker-v2/Backend/src/models/global/JarvisToken.js#L3-L23) | `jarvis_tokens` | `id` (Number, unique), `canonical` (String, indexed), `aliases` ([String]), `type` (Enum: concept, entity, action, technical_term, modifier, procedure), `status` (active, provisional, merged), `confidence` | Canonical vocabulary, entity dictionary, and normalized word IDs. |
| `JarvisRelationship` | [`Backend/src/models/global/JarvisRelationship.js`](file:///e:/Loigmax/tracker-v2/Backend/src/models/global/JarvisRelationship.js#L3-L16) | `jarvis_relationships` | `from` (Token ID), `relation` (String), `to` (Token ID), `confidence` (Number), compound unique index `{ from, relation, to }` | Directed factual graph triples enabling multi-hop reasoning. |
| `JarvisMemory` | [`Backend/src/models/global/JarvisMemory.js`](file:///e:/Loigmax/tracker-v2/Backend/src/models/global/JarvisMemory.js#L3-L25) | `jarvis_memories` | `id` (String, unique), `type` (Enum: PATTERN_PROCEDURE, REASONING_PROCEDURE, COMPOSITE_PROCEDURE, FACT, RULE), `content` (Mixed), `tags` ([String]), `confidence`, `status`, `hitCount` | Execution recipes, workflow blueprints, and distilled procedural recipes. |
| `JarvisTrace` | [`Backend/src/models/global/JarvisTrace.js`](file:///e:/Loigmax/tracker-v2/Backend/src/models/global/JarvisTrace.js#L3-L20) | `jarvis_traces` | `traceId` (UUID, unique), `userId`, `tenantSlug`, `utterance`, `response`, `intent`, `executionPlan`, `toolResults`, `verified`, `offlineResolved` | Full audit trail, latency tracking, verification log. |
| `JarvisChatSession` | [`Backend/src/models/global/JarvisChatSession.js`](file:///e:/Loigmax/tracker-v2/Backend/src/models/global/JarvisChatSession.js#L38-L91) | `jarvis_chat_sessions` | `sessionId`, `userId`, `tenantSlug`, `title`, `messages` ([JarvisMessageSchema]), `discourseState` (focalEntities, lastPredicate, turnCount), `active` | Conversational session history with discourse context state. |

---

## 4. Backend Endpoints (`Backend/src/routes/jarvisRoutes.js`)

Mounted at `/api/jarvis/` via [`Backend/src/app.js`](file:///e:/Loigmax/tracker-v2/Backend/src/app.js#L145):

| Method | Endpoint | Handler Location | Request Body / Params | Response Shape | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/chat` | [`jarvisRoutes.js:12-46`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L12-L46) | `{ utterance, sessionId, conversationHistory }` | `{ success, traceId, response, actionPayload, intent, offlineResolved, verified }` | Main conversational query & HR assistant endpoint |
| `POST` | `/execute` | [`jarvisRoutes.js:51-76`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L51-L76) | `{ tool, params }` | `{ success, tool, data }` | Confirmed transactional tool execution |
| `POST` | `/notifications/digest` | [`jarvisRoutes.js:81-101`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L81-L101) | `{}` | `{ success, data: { unreadCount, totalFetched, notifications, summaryHeadline } }` | Fetches pending approvals and AI digest headline |
| `POST` | `/summarize` | [`jarvisRoutes.js:106-115`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L106-L115) | `{ employeeName, date, activities, commits }` | `{ success, summary, provider, generatedAt }` | Daily standup and git commit executive summary |
| `POST` | `/ticket-assist` | [`jarvisRoutes.js:120-129`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L120-L129) | `{ rawTitle, rawDescription, priority, client, category }` | `{ success, refinedTitle, formattedDescription, suggestedPriority, suggestedType }` | Professional ticket description and priority drafting |
| `POST` | `/messages/summarize` | [`jarvisRoutes.js:134-143`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L134-L143) | `{ conversationId, limit }` | `{ success, summary, unreadCount }` | Group chat unread message catch-up |
| `GET` | `/stats` | [`jarvisRoutes.js:154-196`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L154-L196) | None | `{ success, tokens: {...}, graph: {...}, brainMemory: {...}, neural: {...} }` | Live telemetry, token counts, edge counts, neural weights |
| `POST` | `/train-system` | [`jarvisRoutes.js:202-281`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L202-L281) | None | `{ success, message, stats: { modulesCount, collectionsCount, triplesCount, totalTokens } }` | 1-Click ingestion of ERP schema & domain relationships into Knowledge Graph |
| `POST` | `/train` | [`jarvisRoutes.js:287-342`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L287-L342) | `{ full?: boolean }` | `{ success, trainPairs, initialLoss, finalLoss, delta, checkpointSaved, step, mode }` | Delta-only micro-neural gradient backprop step (AdamW) |
| `POST` | `/teach` | [`jarvisRoutes.js:347-384`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L347-L384) | `{ utterance?: string, subject?: string, relation?: string, object?: string }` | `{ success, message, fact }` | Direct fact ingestion into TokenRegistry and RelationshipGraph |
| `GET` | `/tokens` | [`jarvisRoutes.js:389-401`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L389-L401) | None | `{ success, count, tokens: [...] }` | Retrieves all registered tokens in knowledge brain |
| `GET` | `/graph` | [`jarvisRoutes.js:406-452`](file:///e:/Loigmax/tracker-v2/Backend/src/routes/jarvisRoutes.js#L406-L452) | None | `{ success, count, edges: [{ source, relation, target, weight }] }` | Retrieves all relational edges for graph visualizer |

---

## 5. Frontend Architecture & React Components

The J.A.R.V.I.S. UI suite resides in `Frontend/src/components/Jarvis/`, driven by [`Frontend/src/services/jarvisService.js`](file:///e:/Loigmax/tracker-v2/Frontend/src/services/jarvisService.js) and rendered on the `/jarvis` top-level route ([`Frontend/src/pages/jarvis.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/pages/jarvis.jsx)):

| Component | File Path | Primary Functionality |
| :--- | :--- | :--- |
| **`JarvisCognitiveStudio`** | [`Frontend/src/components/Jarvis/JarvisCognitiveStudio.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisCognitiveStudio.jsx) | Master container holding multi-tab workspace: Chat, Explorer, Training, Summarizer, Ticket Assist, and Telemetry header. |
| **`JarvisTelemetryHeader`** | [`Frontend/src/components/Jarvis/JarvisTelemetryHeader.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTelemetryHeader.jsx) | High-density status strip showing active tokens, graph edges, neural parameters, and loss metrics. |
| **`JarvisChatInterface`** | [`Frontend/src/components/Jarvis/JarvisChatInterface.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisChatInterface.jsx) | Interactive chat console with voice/text input, quick suggestion pills, offline 0-token badges, and execution confirmation modals. |
| **`JarvisKnowledgeExplorer`** | [`Frontend/src/components/Jarvis/JarvisKnowledgeExplorer.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisKnowledgeExplorer.jsx) | Interactive graph browser & token inspector with search filter, type badges, and real-time edge visualization. |
| **`JarvisTrainingStudio`** | [`Frontend/src/components/Jarvis/JarvisTrainingStudio.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTrainingStudio.jsx) | Cognitive training console for 1-Click ERP ingestion, delta AdamW gradient steps, and manual fact teaching (`Subject -> Relation -> Object`). |
| **`JarvisNotificationDigest`** | [`Frontend/src/components/Jarvis/JarvisNotificationDigest.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisNotificationDigest.jsx) | Executive card extracting pending leaves/regularizations with one-click batch approval buttons. |
| **`JarvisFeedSummarizer`** | [`Frontend/src/components/Jarvis/JarvisFeedSummarizer.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisFeedSummarizer.jsx) | Workhub Feed & Daily standup summary generator pulling logged activities and git commits. |
| **`JarvisTicketAssist`** | [`Frontend/src/components/Jarvis/JarvisTicketAssist.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisTicketAssist.jsx) | Ticket drafting modal refining raw user notes into standard Agile acceptance criteria and suggested priority. |
| **`JarvisChatCatchup`** | [`Frontend/src/components/Jarvis/JarvisChatCatchup.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisChatCatchup.jsx) | Team communication catchup widget summarizing unread channel conversations. |
| **`JarvisWidget`** | [`Frontend/src/components/Jarvis/JarvisWidget.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisWidget.jsx) | Global floating launcher widget accessible across any ERP page. |
| **`JarvisOnboardingModal`** | [`Frontend/src/components/Jarvis/JarvisOnboardingModal.jsx`](file:///e:/Loigmax/tracker-v2/Frontend/src/components/Jarvis/JarvisOnboardingModal.jsx) | First-time user tour explaining cognitive capabilities and offline features. |

---

## 6. Flow Risk Matrix & Potential Failure Modes

| Risk Code | Failure Mode | Root Cause | Impact | Automated Mitigation in Code |
| :--- | :--- | :--- | :--- | :--- |
| **RISK-JARVIS-001** | Graph Traversal Infinite Loop / Cycle | Cyclic directed relationships (e.g., A -> B -> C -> A) | CPU spin or stack overflow during multi-hop search | `GraphReasoner._searchMultiHopPaths` enforces `visitedNodes` Set per traversal branch; cycles immediately pruned with 0 confidence penalty. |
| **RISK-JARVIS-002** | Stale / Unsynchronized Knowledge Graph | Tenant modified custom models or collections without triggering graph sync | Graph Reasoner returns false negatives on newly created tables | `POST /api/jarvis/train-system` re-indexes all `tenantRegistry` collections and metadata dynamically in 1 call. |
| **RISK-JARVIS-003** | External LLM API Downtime / Latency Spike | Internet outage or rate-limiting on external AI provider (OpenAI / Anthropic) | User requests without graph edges hang or error | `IntentClassifier` checks local graph first. If offline hit occurs, response returns in <5ms without touching `LLMManager`. |
| **RISK-JARVIS-004** | Overfitting / Gradient Explosion during Delta Training | High learning rate or skewed repetitive fact batch in AdamW trainer | Neural core weights diverge | `CapacityGovernor.js` limits AdamW learning rate ($1e-3$), caps max delta epochs to 5, and clips gradients ($[-1.0, 1.0]$). |
| **RISK-JARVIS-005** | Unauthorized Transactional Execution | Malicious user asking chatbot to execute state mutation (e.g. approve leaves) | Privilege escalation bypassing ABAC | `PolicyEngine.js` verifies permissions against `tool.risk`. High/medium risk tools flag `requiresConfirmation: true` and require user token verification. |
