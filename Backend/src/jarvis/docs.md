# J.A.R.V.I.S. Cognitive Architecture & Autonomous Self-Evolution Blueprint

> **Core Philosophy:** The external LLM serves as a **Master Teacher, Code Generator, and Reasoning Mentor**. J.A.R.V.I.S. is not a simple chatbot or rigid regex script—it is an evolving, autonomous Neurosymbolic Cognitive Brain. Once concepts, entities, relationships, and execution procedures are assimilated into J.A.R.V.I.S.'s memory and knowledge graph, they are executed **directly, deterministically, and offline without external LLM API calls**.

---

## 1. The Tri-Layer Cognitive Brain Schemas

J.A.R.V.I.S. persists all vocabulary, relationships, and execution recipes in Global MongoDB across three foundational schemas:

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
    ║                         ║  ║                         ║  ║                         ║
    ║ • "India's"  -> ID 101  ║  ║ • (101: India)          ║  ║ • Math calculation code ║
    ║ • "Bharat"   -> ID 101  ║  ║      │                  ║  ║ • Ticket layout recipes ║
    ║ • "Capital"  -> ID 103  ║  ║   [has_capital]         ║  ║ • Leave approval steps  ║
    ║ • "Delhi"    -> ID 102  ║  ║      ▼                  ║  ║ • Parametric slots      ║
    ║ • "policyEngine"->ID 201║  ║   (102: Delhi)          ║  ║ • ABAC decision logic   ║
    ╚═════════════════════╝  ╚═════════════════════╝  ╚═════════════════════╝
```

---

## 2. Bidirectional Ingestion Pipeline (Input & Response Tokenization)

Learning is not one-way. Both the **User's Input Utterance** and the **Teacher's Generated Response / Code Artifacts** are actively parsed and ingested into J.A.R.V.I.S.'s brain.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                     USER INPUT UTTERANCE                    │
       │    "Integrate AI Agent into Leave Approval Workflow"        │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                   LLM TEACHER GENERATES                     │
       │  (Generates full ticket spec with files, hooks, & criteria) │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ╔═════════════════════════════════════════════════════════════╗
       ║         BIDIRECTIONAL SEMANTIC INGESTION ENGINE             ║
       ╠═════════════════════════════════════════════════════════════╣
       ║ 1. INPUT PARSER:                                            ║
       ║    • Extracts query entities & intents.                     ║
       ║                                                             ║
       ║ 2. RESPONSE & ARTIFACT TOKENIZER (Output Harvester):        ║
       ║    • Extracts newly introduced technical terms, files,      ║
       ║      and nouns into `JarvisToken` (e.g. "Leave Approval",   ║
       ║      "beforeApproval", "policyEngine.js", "ABAC").          ║
       ║                                                             ║
       ║ 3. RESPONSE TRIPLET EXTRACTOR:                              ║
       ║    • Extracts factual & architectural relationships:        ║
       ║      (Leave Approval) ─[uses_hook]─► (beforeApproval)       ║
       ║      (Leave Request) ─[evaluated_by]─► (policyEngine)       ║
       ║    • Persists edges into `JarvisRelationship`.              ║
       ║                                                             ║
       ║ 4. PROCEDURAL SCHEMA COMPILER:                              ║
       ║    • Distills the structural recipe into `JarvisMemory`     ║
       ║      (e.g. Ticket Specification Blueprint).                 ║
       ╚═════════════════════════════════════════════════════════════╝
```

---

## 3. The 4-Stage Lifelong Cognitive Loop

```
[ Natural Language Request / System Event ]
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: SEMANTIC DECOMPOSITION (`TokenEngine` & `IntentClassifier`)        │
│ • Deconstructs input into tokens, entities, and relationship targets.       │
│ • Identifies Subject (e.g., "India") and Predicate (e.g., "capital").       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: LOCAL GRAPH FIRST-PASS (Offline Reflex - 0 LLM Tokens)             │
│ • Traverses `RelationshipGraph.resolveProperty(Subject, Predicate)`.        │
│ • If match exists: Returns response immediately in <5ms with 0 API tokens. │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (If fact is missing from local graph)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: EPISTEMIC GAP DETECTION & AUTONOMOUS DISCOVERY                     │
│ • Recognizes the gap: "I understand the concept, but lack the factual node".│
│ • Dispatches Autonomous Discovery Tool (`browser.search` / code scanner).   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: TEACHER-STUDENT DISTILLATION & BIDIRECTIONAL HARVESTING            │
│ • LLM Teacher synthesizes the solution or resolves discovery data.          │
│ • `LearningAnalyst` tokenizes both the prompt and the response.             │
│ • Ingests new tokens (`JarvisToken`), triples (`JarvisRelationship`), and   │
│   execution recipes (`JarvisMemory`) into MongoDB.                          │
│ • J.A.R.V.I.S. permanently owns this knowledge for all future requests.     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End Scenarios & Behavioral Traces

### Scenario A: Factual Graph Compounding & Epistemic Discovery

1. **User says:** *"Remember this: I am from country India."*
   * `LearningAnalyst` creates token: `India` (entity, country).
   * Creates edge: `(User) --[from_country]--> (India)`.
2. **User says:** *"Remember Chennai is the capital of Tamil Nadu."*
   * Creates tokens: `Tamil Nadu` (entity, state), `Chennai` (entity, city), `capital` (concept).
   * Creates edges: `(Tamil Nadu) --[has_capital]--> (Chennai)` and `(Tamil Nadu) --[state_of]--> (India)`.
3. **User asks:** *"What is the capital of India?"*
   * **Local Graph Check:** Graph has `India` and `capital`, but no `(India)-[has_capital]->(?)` edge.
   * **Epistemic Trigger:** Dispatches `browser.search({ query: "capital of India" })`.
   * **Discovery Ingestion:** Discovers `"New Delhi"`.
   * **Bidirectional Harvest:** Inserts `Delhi` into `JarvisToken` and connects `(India) --[has_capital]--> (Delhi)`.
4. **Subsequent Queries:**
   * *"What's India's capital?"*
   * *"India capital?"*
   * *"Tell me India's capital city."*
   * *"Which city is the capital of India?"*
   * *"Can you tell me the capital city of India?"*
   * **Result:** **100% resolved offline via `RelationshipGraph` in <5ms with ZERO LLM API tokens.**

---

### Scenario B: Complex Software Engineering & Artifact Generation

1. **User provides title:** *"Integrate AI Agent into Leave Approval Workflow"*.
2. **Turn 1 (Bootstrap):**
   * LLM Teacher drafts the complete 400-word ticket specification (Objective, Scope, Hooks in `leave.service.js`, `policyEngine.js` ABAC checks, Acceptance Criteria).
3. **Turn 1 Post-Execution (Bidirectional Ingestion):**
   * **Tokens Harvested:** `Leave Approval`, `Lifecycle Hook`, `beforeApproval`, `policyEngine`, `ABAC`.
   * **Triples Harvested:**
     * `(Leave Approval) ──[requires_hook]──► (beforeApproval)`
     * `(Leave Request) ──[evaluated_by]──► (policyEngine)`
   * **Memory Recipe Saved:** `TICKET_SPECIFICATION_RECIPE` in `JarvisMemory`.
4. **Turn 2 and Beyond:**
   * User says: *"Create ticket: Add push notification alerts to Attendance Overtime Workflow"*.
   * J.A.R.V.I.S. matches the learned procedural blueprint, auto-links the attendance service hooks, and drafts the ticket with zero prompt engineering.

---

## 5. Current Code Audit vs Required Modifications

| Component | Current Implementation | Target Required Modification |
| :--- | :--- | :--- |
| **[LearningAnalyst.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/LearningAnalyst.js)** | Only saves raw regex strings from `ctx.utterance` into `JarvisMemory`. | **Upgrade to Bidirectional Harvester: Tokenizes response words, extracts entities, and writes triples to `JarvisRelationship` & `JarvisToken`.** |
| **[IntentClassifier.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/IntentClassifier.js)** | Only performs regex pattern matching. | **Add Local Graph First-Pass: Queries `RelationshipGraph.resolveProperty(subject, predicate)` before calling LLMs.** |
| **[RelationshipGraph.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/RelationshipGraph.js)** | Passive database persistence of IDs. | **Add Semantic Path Resolution & Multi-Hop Traversal (e.g. `User -> country -> India -> capital -> Delhi`).** |
| **[ToolRegistry.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/ToolRegistry.js)** | Internal HRMS and Math tools. | **Register `browser.search` / Knowledge Discovery Tool for autonomous epistemic resolution.** |
| **[ResponseGenerator.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ResponseGenerator.js)** | Direct LLM text generation. | **Render factual graph triples directly as concise natural language responses (0 LLM cost).** |

---

## 6. Architectural Guarantees (Sacred Laws)

1. **Bidirectional Absorption:** No words, entities, or relationships generated by the LLM Teacher may be discarded; all are harvested to compound J.A.R.V.I.S.'s internal intelligence.
2. **Deterministic Precedence:** If a factual or procedural path exists in `RelationshipGraph` or `JarvisMemory`, it must execute offline without contacting external LLM APIs.
3. **Zero Hardcoded Business Strings:** All knowledge, roles, entities, and relationships are dynamic schema records stored across `JarvisToken`, `JarvisRelationship`, and `JarvisMemory`.
