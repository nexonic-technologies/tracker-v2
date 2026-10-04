---
Module: Jarvis
Purpose: Schema Analysis, Database Indexes, and Storage Scaling Profiles
Last Updated: 2026-09-08
---

# J.A.R.V.I.S. Schema & Database Analysis

## 1. Global MongoDB Schema Inventory

All J.A.R.V.I.S. models reside in the Global MongoDB database (`tracker_global`).

### 1.1 `JarvisToken` (`jarvis_tokens`)
Stores canonical terms, synonyms, entity descriptors, and normalized token IDs.

```javascript
{
  id: { type: Number, required: true, unique: true },
  canonical: { type: String, required: true, index: true },
  aliases: [{ type: String, index: true }],
  type: {
    type: String,
    enum: ['concept', 'action', 'entity', 'technical_term', 'modifier', 'procedure', 'unknown'],
    default: 'concept'
  },
  status: {
    type: String,
    enum: ['active', 'provisional', 'merged', 'deprecated'],
    default: 'active'
  },
  aliasOf: { type: Number, default: null },
  confidence: { type: Number, default: 1.0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
}
```

* **Indexes**:
  * `{ id: 1 }` (unique primary identifier)
  * `{ canonical: 1 }` (exact string lookup)
  * `{ aliases: 1 }` (multikey index for fast alias matching)
* **Risk / Growth**: Fast in-memory cache lookup via `TokenRegistry.js`. Anticipated size: 10,000 - 100,000 documents (~10-50 MB memory footprint).

---

### 1.2 `JarvisRelationship` (`jarvis_relationships`)
Stores directed graph edges connecting tokens with confidence scores.

```javascript
{
  from: { type: Number, required: true, index: true },
  relation: { type: String, required: true, index: true },
  to: { type: Number, required: true, index: true },
  confidence: { type: Number, default: 1.0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
}
```

* **Indexes**:
  * `{ from: 1, relation: 1, to: 1 }` (Compound Unique Index: guarantees zero duplicate factual edges)
  * `{ from: 1 }` (forward traversal)
  * `{ to: 1 }` (reverse traversal)
  * `{ relation: 1 }` (predicate filtering)
* **Growth Profile**: Scales with knowledge base size ($O(E)$ where $E \approx 3V$). In-memory representation managed via `RelationshipGraph.js` adjacency list.

---

### 1.3 `JarvisMemory` (`jarvis_memories`)
Stores operational procedures, action recipes, and extracted procedural blueprints.

```javascript
{
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['PATTERN_PROCEDURE', 'REASONING_PROCEDURE', 'COMPOSITE_PROCEDURE', 'RELATIONSHIP', 'FACT', 'PREFERENCE', 'RULE'],
    required: true,
    index: true
  },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  tags: [{ type: String, index: true }],
  confidence: { type: Number, default: 0.8 },
  status: { type: String, enum: ['active', 'deprecated', 'learned'], default: 'active' },
  hitCount: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: Date.now }
}
```

* **Indexes**:
  * `{ id: 1 }` (unique)
  * `{ type: 1, status: 1 }` (compound index for fast active procedure filtering)
  * `{ tags: 1 }` (multikey index for tag-based semantic matching)

---

### 1.4 `JarvisTrace` (`jarvis_traces`)
Immutable audit ledger for telemetry, decision explainability, and cognitive performance tracking.

```javascript
{
  traceId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true },
  tenantSlug: { type: String, index: true },
  utterance: { type: String },
  response: { type: String },
  intent: { type: mongoose.Schema.Types.Mixed },
  executionPlan: { type: mongoose.Schema.Types.Mixed },
  toolResults: [{ type: mongoose.Schema.Types.Mixed }],
  trace: [{ type: mongoose.Schema.Types.Mixed }],
  verified: { type: Boolean, default: false },
  offlineResolved: { type: Boolean, default: false }
}
```

* **Indexes**:
  * `{ traceId: 1 }` (unique)
  * `{ userId: 1, createdAt: -1 }` (per-user audit lookup)
  * `{ tenantSlug: 1, createdAt: -1 }` (tenant-level observability)
* **Retention Strategy**: High volume collection. Recommend automated MongoDB TTL index (e.g. 90 days retention) in production environments.

---

### 1.5 `JarvisChatSession` (`jarvis_chat_sessions`)
Maintains conversational history, discourse state, and active topic entities across user sessions.

```javascript
{
  sessionId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  employeeId: { type: String, index: true },
  tenantSlug: { type: String, default: 'admin', index: true },
  title: { type: String, trim: true },
  messages: [JarvisMessageSchema],
  discourseState: {
    focalEntities: [{ id: Number, canonical: String, type: String, lastMentionedAt: Date }],
    lastPredicate: String,
    turnCount: { type: Number, default: 0 }
  },
  active: { type: Boolean, default: true }
}
```

* **Indexes**:
  * `{ sessionId: 1 }`
  * `{ userId: 1, active: 1 }`
  * `{ updatedAt: -1 }`
