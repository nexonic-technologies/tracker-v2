import { defaultTokenRegistry, TokenType, TokenStatus } from './TokenRegistry.js';
import { defaultRelationshipGraph } from './RelationshipGraph.js';
import { TokenDiscovery } from './TokenDiscovery.js';
import { defaultAIResolver } from './AIResolver.js';

/**
 * Self-Growing Token & Concept Engine
 */
export class TokenEngine {
  constructor({
    registry,
    graph,
    discovery,
    aiResolver,
    enableAI = true,
  } = {}) {
    this.registry = registry || defaultTokenRegistry;
    this.graph = graph || defaultRelationshipGraph;
    this.discovery = discovery || new TokenDiscovery({ registry: this.registry });
    this.aiResolver = aiResolver || defaultAIResolver;
    this.enableAI = enableAI;
    this.resolutionCache = new Map();
    this.stats = {
      totalProcessed: 0,
      knownHits: 0,
      aiCalls: 0,
      newTokensCreated: 0,
    };
  }

  async process(text, { useAI = this.enableAI, context = '' } = {}) {
    if (!text || typeof text !== 'string') {
      return { tokens: [], relationships: [], newTokensCreated: [], stats: this.stats };
    }

    const raw = text.trim();
    this.stats.totalProcessed += 1;

    const discovered = this.discovery.discover(raw);
    const resolvedTokens = [];
    const newTokensCreated = [];
    const currentContextTokens = [];

    for (const item of discovered) {
      if (item.isKnown && item.token) {
        this.stats.knownHits += 1;
        resolvedTokens.push(item.token);
        currentContextTokens.push(item.token);
        continue;
      }

      const existing = this.registry.lookup(item.text);
      if (existing) {
        this.stats.knownHits += 1;
        resolvedTokens.push(existing);
        currentContextTokens.push(existing);
        continue;
      }

      const cacheKey = item.text.toLowerCase().trim();
      if (this.resolutionCache.has(cacheKey)) {
        const cached = this.resolutionCache.get(cacheKey);
        resolvedTokens.push(cached);
        currentContextTokens.push(cached);
        continue;
      }

      let tokenRecord;
      if (useAI && this.aiResolver && this.aiResolver.isAvailable?.()) {
        this.stats.aiCalls += 1;
        const resolution = await this.aiResolver.resolveConcept({
          candidate: item.text,
          context: raw + (context ? ` [Domain: ${context}]` : ''),
          knownTokens: currentContextTokens,
        });

        tokenRecord = this.registry.register({
          canonical: resolution.canonical || item.text,
          type: resolution.type || TokenType.CONCEPT,
          status: resolution.status === 'resolved' ? TokenStatus.ACTIVE : TokenStatus.UNCERTAIN,
          metadata: {
            confidence: resolution.confidence,
            reasoning: resolution.reasoning,
            sourceCandidate: item.text,
            contextScope: context || undefined,
          },
        });

        if (Array.isArray(resolution.relationships)) {
          for (const rel of resolution.relationships) {
            let targetId = null;
            if (typeof rel.targetConceptOrId === 'number') {
              targetId = rel.targetConceptOrId;
            } else if (typeof rel.targetConceptOrId === 'string') {
              const matchedTarget = this.registry.lookup(rel.targetConceptOrId);
              if (matchedTarget) targetId = matchedTarget.id;
            }

            if (targetId && targetId !== tokenRecord.id) {
              this.graph.addRelationship(tokenRecord.id, rel.relation, targetId, {
                confidence: resolution.confidence,
              });
            }
          }
        }
      } else {
        tokenRecord = this.registry.register({
          canonical: item.text,
          type: item.candidateType || TokenType.CONCEPT,
          status: TokenStatus.ACTIVE,
          metadata: {
            localDeterministic: true,
            contextScope: context || undefined,
          },
        });
      }

      this.stats.newTokensCreated += 1;
      this.resolutionCache.set(cacheKey, tokenRecord);
      newTokensCreated.push(tokenRecord);
      resolvedTokens.push(tokenRecord);
      currentContextTokens.push(tokenRecord);
    }

    const turnRelationships = [];
    for (let i = 0; i < resolvedTokens.length - 1; i++) {
      const current = resolvedTokens[i];
      const next = resolvedTokens[i + 1];

      if (current.id !== next.id) {
        let relation = 'related_to';
        if (current.type === TokenType.ENTITY && next.type === TokenType.ACTION) {
          relation = 'performs';
        } else if (current.type === TokenType.ACTION && next.type === TokenType.CONCEPT) {
          relation = 'acts_on';
        }

        // Return ephemeral utterance features without mutating the persistent RelationshipGraph
        turnRelationships.push({
          from: current.id,
          relation,
          to: next.id,
          ephemeral: true,
        });
      }
    }

    return {
      tokens: resolvedTokens.map((t) => ({
        id: t.id,
        canonical: t.canonical,
        type: t.type,
        status: t.status,
      })),
      relationships: turnRelationships.map((r) => ({
        from: r.from,
        relation: r.relation,
        to: r.to,
      })),
      newTokensCreated,
      stats: { ...this.stats },
    };
  }

  assignToken({ canonical, customId, type = TokenType.CONCEPT, aliases = [], metadata = {} }) {
    return this.registry.register({
      canonical,
      customId,
      type,
      aliases,
      metadata,
    });
  }

  mergeTokens(sourceId, targetId) {
    const target = this.registry.merge(sourceId, targetId);
    this.resolutionCache.clear();
    return target;
  }
}

export const defaultTokenEngine = new TokenEngine();
export default defaultTokenEngine;
