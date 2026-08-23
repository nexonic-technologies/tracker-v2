# SACRED RULE: Pure Raw Data Flow & Zero Procedural Categorization Hacks (ZERO TOLERANCE)

## Purpose
Prohibits the AI agent from writing procedural categorization hacks, ad-hoc string formatting chains, or manual dictionary partitioning in application code. Raw database entities and domain models must flow directly to the Cognitive Engine / Teacher, letting the neural/symbolic brain understand relations natively.

## Uncompromising Behavioral Laws
1. **SACRED LAW: Zero Procedural Partitioning**:
   - NEVER manually partition data into ad-hoc procedural arrays (e.g. `approvals = []`, `tickets = []`, `mentions = []`, `clusters.map(...)`).
   - Domain tools must strictly return pure, unmodified database entity arrays directly from Mongoose/MongoDB collections.

2. **SACRED LAW: Zero String Hardcoding / Zero Heuristic Concatenation**:
   - NEVER write heuristic text stitching (`narrative.push(...)`, `sample.join(...)`, `You have X unread updates...`) in domain tools, realizers, or services.
   - All executive briefings, summaries, dialogues, and natural language outputs must be derived either through:
     - Verified canonical Knowledge Graph facts (`RelationshipGraph.js`).
     - Learned Parametric Procedures (`jarvis_memories`).
     - The LLM Teacher for epistemic gaps, immediately ingested into the Global Brain.

3. **SACRED LAW: Raw Entity Grounding**:
   - When calling the Cognitive Engine / LLM Teacher, ALWAYS pass the exact structured JSON records (`JSON.stringify(rawEntities)`).
   - Constrain the model to 100% factual fidelity over the provided records, eliminating hallucinations.

4. **SACRED LAW: Pre-Code Gate Decision**:
   - Before writing any code for a tool, service, or realizer, confirm:
     * `✓ Is this returning pure declarative database data?`
     * `✓ Are all heuristic switch/if string builders eliminated?`
     * `✓ Is the resulting knowledge ingested into MongoDB Global Brain for 0-token offline reuse?`
