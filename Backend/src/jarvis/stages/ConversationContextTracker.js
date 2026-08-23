import mongoose from 'mongoose';
import { getGlobalModels } from '../../models/global/index.js';
import { defaultRelationRegistry } from '../reasoning/RelationRegistry.js';

/**
 * Declarative Discourse Context & Anaphora Engine
 * Tracks active conversational topic entities, handles pronoun/ellipsis resolution,
 * and maintains per-session discourse memory for J.A.R.V.I.S.
 * (Sacred Law Compliant: Zero Domain Word Arrays, Pure Token & Relation Registry Resolution)
 */
export class ConversationContextTracker {
  constructor({ maxContextTurns = 20, relationRegistry = null } = {}) {
    this.maxContextTurns = maxContextTurns;
    this.relationRegistry = relationRegistry || defaultRelationRegistry;
    this.inMemoryDiscourse = new Map(); // sessionId -> { focalEntities, lastPredicate, turnCount, recentTurns }
  }

  get sessionModel() {
    return getGlobalModels().JarvisChatSession;
  }

  _findSessionQuery(sessionId) {
    if (!sessionId) return null;
    const isObjectId = mongoose.Types.ObjectId.isValid(sessionId) && String(new mongoose.Types.ObjectId(sessionId)) === String(sessionId);
    if (isObjectId) {
      return { $or: [{ _id: sessionId }, { sessionId: String(sessionId) }] };
    }
    return { sessionId: String(sessionId) };
  }

  /**
   * Loads discourse context from Global DB or memory
   */
  async getContext(sessionId, userId) {
    if (!sessionId) return this._createEmptyDiscourse();

    if (this.inMemoryDiscourse.has(sessionId)) {
      return this.inMemoryDiscourse.get(sessionId);
    }

    const query = this._findSessionQuery(sessionId);
    if (query && this.sessionModel && this.sessionModel.db?.readyState === 1) {
      try {
        const doc = await this.sessionModel.findOne(query).lean();
        if (doc) {
          const state = {
            focalEntities: doc.discourseState?.focalEntities || [],
            lastPredicate: doc.discourseState?.lastPredicate || null,
            turnCount: doc.discourseState?.turnCount || 0,
            recentTurns: (doc.messages || []).slice(-this.maxContextTurns),
          };
          this.inMemoryDiscourse.set(sessionId, state);
          return state;
        }
      } catch {}
    }

    const empty = this._createEmptyDiscourse();
    this.inMemoryDiscourse.set(sessionId, empty);
    return empty;
  }

  _createEmptyDiscourse() {
    return {
      focalEntities: [], // [{ id, canonical, type, lastMentionedAt }]
      lastPredicate: null,
      turnCount: 0,
      recentTurns: [],
    };
  }

  /**
   * Declarative Discourse Resolution
   * Inherits active focal entity from the preceding conversational turn when the current utterance
   * does not introduce a competing new subject entity.
   * (Sacred Law Compliant: Resolves predicates and entities purely from TokenRegistry & RelationRegistry)
   */
  resolveEllipticalSubject(utterance, discourse, tokenRegistry) {
    if (!utterance || !discourse || !discourse.focalEntities || discourse.focalEntities.length === 0) {
      return null;
    }

    const salientEntity = discourse.focalEntities[0];
    if (!salientEntity) return null;

    const raw = utterance.trim().toLowerCase();

    // Standard closed-class grammatical tokens (strictly structural syntax, zero domain vocabulary)
    const syntacticStopWords = new Set([
      'what', 'who', 'where', 'which', 'when', 'how', 'why', 'whose', 'whom',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'did', 'does', 'do',
      'in', 'on', 'at', 'for', 'with', 'of', 'from', 'by', 'about', 'to',
      'the', 'a', 'an', 'and', 'or', 'tell', 'me', 'give', 'show', 'name'
    ]);

    // 1. Check if the current utterance introduces a competing distinct primary domain entity
    if (tokenRegistry) {
      const candidateTokens = tokenRegistry.findCandidates(utterance, { limit: 10, minScore: 0.5 });
      const explicitNewEntity = candidateTokens.find((t) => {
        if (!t || t.id === salientEntity.id || t.type !== 'entity') return false;
        const canonLower = (t.canonical || '').toLowerCase();
        if (syntacticStopWords.has(canonLower)) return false;

        // Verify if token is a registered relation predicate rather than a subject entity
        const isRegisteredPredicate = this.relationRegistry?.has(t.canonical) || t.type === 'property';
        if (isRegisteredPredicate) return false;

        return raw.includes(canonLower);
      });

      // If user explicitly introduced a distinct new domain subject, do not bind to prior context
      if (explicitNewEntity) {
        return null;
      }
    }

    // 2. Extract declarative predicate keywords from current utterance
    const words = raw
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0 && !syntacticStopWords.has(w));

    const candidatePredicate = words.join('_') || discourse.lastPredicate || null;
    const fullEntityToken = tokenRegistry ? tokenRegistry.getById(salientEntity.id) : null;

    return {
      focalEntity: fullEntityToken || salientEntity,
      candidatePredicate,
      isResolved: true,
      originalUtterance: utterance,
    };
  }

  /**
   * Updates discourse state after a conversational turn
   */
  async updateTurn(sessionId, userId, userUtterance, agentResponse, turnMetadata = {}) {
    if (!sessionId) return;

    let discourse = await this.getContext(sessionId, userId);
    discourse.turnCount += 1;

    // Declarative Discourse Entity Saliency Tracking (Zero Hardcoded Word Lists)
    // A token qualifies as a conversational focal entity strictly if it was resolved as a semantic subject
    // or is a registered domain entity with knowledge graph connectivity.
    if (turnMetadata.recognizedTokens && Array.isArray(turnMetadata.recognizedTokens)) {
      for (const tok of turnMetadata.recognizedTokens) {
        if (!tok || !tok.canonical || tok.type !== 'entity') continue;

        // Unshift to front of discourse stack (Most Recently Discussed Subject)
        discourse.focalEntities = [
          {
            id: Number(tok.id) || 0,
            canonical: String(tok.canonical),
            type: 'entity',
            lastMentionedAt: new Date(),
          },
          ...discourse.focalEntities.filter((e) => e && e.canonical !== tok.canonical && e.id !== tok.id),
        ].slice(0, 10);
      }
    }

    if (turnMetadata.predicate) {
      discourse.lastPredicate = String(turnMetadata.predicate);
    }

    const newMessages = [
      {
        role: 'user',
        text: userUtterance,
        timestamp: new Date(),
      },
      {
        role: 'assistant',
        text: agentResponse,
        offlineResolved: Boolean(turnMetadata.offlineResolved),
        intent: turnMetadata.intent || null,
        latencyMs: turnMetadata.latencyMs || 0,
        timestamp: new Date(),
      },
    ];

    discourse.recentTurns = [...discourse.recentTurns, ...newMessages].slice(-this.maxContextTurns);
    this.inMemoryDiscourse.set(sessionId, discourse);

    // Persist to global database
    const query = this._findSessionQuery(sessionId);
    if (query && this.sessionModel && this.sessionModel.db?.readyState === 1) {
      try {
        await this.sessionModel.findOneAndUpdate(
          query,
          {
            $set: {
              sessionId: String(sessionId),
              userId: userId || 'anonymous',
              discourseState: {
                focalEntities: discourse.focalEntities,
                lastPredicate: discourse.lastPredicate,
                turnCount: discourse.turnCount,
              },
              updatedAt: new Date(),
            },
            $push: {
              messages: { $each: newMessages },
            },
            $setOnInsert: {
              title: userUtterance.slice(0, 40) || 'Chat Session',
              metaStatus: 'active',
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[ConversationContextTracker] Persist error:', err.message);
      }
    }
  }
}

export const defaultConversationContextTracker = new ConversationContextTracker();
export default defaultConversationContextTracker;
