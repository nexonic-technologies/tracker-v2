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

## 5. Implemented Architectural Components

| Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **[LearningAnalyst.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/LearningAnalyst.js)** | **IMPLEMENTED** | Bidirectional Harvester: Tokenizes response words, extracts entities, and writes triples to `JarvisRelationship`, `JarvisToken`, and `JarvisMemory`. |
| **[IntentClassifier.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/IntentClassifier.js)** | **IMPLEMENTED** | Local Graph First-Pass: Queries `RelationshipGraph.resolveProperty(subject, predicate)` and invokes `GraphReasoner` before falling back to external LLMs. |
| **[GraphReasoner.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/reasoning/GraphReasoner.js)** | **IMPLEMENTED** | Universal Multi-Hop Cognitive Reasoning: Implements controlled multi-hop beam traversal (max 8 hops, beam width 16), cycle prevention, hop decay scoring ($0.96$), and target taxonomy matching. |
| **[EntityCanonicalizer.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tokens/EntityCanonicalizer.js)** | **IMPLEMENTED** | Universal Entity Canonicalizer & Morphological Normalizer: Resolves entities and taxonomic descriptors generically without hardcoded keyword arrays. |
| **[ConversationContextTracker.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ConversationContextTracker.js)** | **IMPLEMENTED** | Declarative Discourse Context & Anaphora Engine: Tracks focal entities, last predicate, and turn history across user sessions in `jarvis_chat_sessions`. |
| **[SGLMBrain.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/sglm/core/SGLMBrain.js)** | **IMPLEMENTED** | Small Graph Language Model: Encapsulates neural copy transformer models (`MultiHeadCopyTransformer`, `TwoLayerInspectableTransformer`) and empirical benchmark harness. |
| **[JarvisNeuralCore.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/neural/JarvisNeuralCore.js)** | **IMPLEMENTED** | Micro-Neural Core: Performs delta-only AdamW gradient distillation on newly acquired knowledge graph triples (<5ms backprop). |
| **[ToolRegistry.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/tools/ToolRegistry.js)** | **IMPLEMENTED** | Enterprise Tool Suite: Notifications digest & batch approvals, Daily standup generator, Ticket drafting assist, Chat message catch-up, HRMS, Math, and Browser search tools. |
| **[ResponseGenerator.js](file:///e:/Loigmax/tracker-v2/Backend/src/jarvis/stages/ResponseGenerator.js)** | **IMPLEMENTED** | Renders verified factual graph triples directly as concise natural language responses (0 LLM cost) or delegates to LLM Teacher during epistemic gaps. |

---

## 6. Architectural Guarantees (Sacred Laws)

1. **Bidirectional Absorption:** No words, entities, or relationships generated by the LLM Teacher may be discarded; all are harvested to compound J.A.R.V.I.S.'s internal intelligence.
2. **Deterministic Precedence:** If a factual or procedural path exists in `RelationshipGraph` or `JarvisMemory`, it must execute offline without contacting external LLM APIs.
3. **Zero Hardcoded Business Strings:** All knowledge, roles, entities, and relationships are dynamic schema records stored across `JarvisToken`, `JarvisRelationship`, and `JarvisMemory`.

---

## 7. Extended Cognitive Subsystems

### 7.1 Multi-Hop Graph Reasoner (`reasoning/`)
* **Beam Search Exploration**: Explores up to 8 hops with a beam width of 16 paths.
* **Taxonomy Alignment**: Rewards target matches with a $2.5\times$ weight boost while penalizing mismatched semantic types ($0.4\times$).
* **Cycle Guard**: Branch-level visited sets guarantee zero infinite loops on cyclic relationship chains.

### 7.2 Small Graph Language Model (`sglm/`)
* **Pointer-Copying Attention**: Uses transparent multi-head copy transformers to bridge neural representations directly with graph triple tokens.
* **Empirical Benchmarks**: Automated evaluation harness (`ReasoningBenchmarkRunner.js`) testing multi-hop inference accuracy across generated graph topologies.

### 7.3 Micro-Neural Gradient Distillation (`neural/`)
* **Delta Backpropagation**: Evaluates only newly assimilated triples since step $t$. If no new facts exist, backpropagation is skipped, resulting in 0% CPU consumption.
* **Capacity Governor**: Clips gradients to $[-1.0, 1.0]$ and caps training epochs to ensure numerical stability and prevent catastrophic forgetting.

