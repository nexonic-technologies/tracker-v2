/**
 * Epistemic Gap Analyzer
 * Evaluates cognitive certainty, categorizes reasoning state (KNOWN / UNCERTAIN / UNKNOWN),
 * and governs Teacher escalation without ad-hoc heuristic if-chains.
 * (Sacred Law Compliant: Declarative confidence policies & evidence-guided escalation)
 */

export const EpistemicStatus = {
  KNOWN: 'KNOWN',
  UNCERTAIN: 'UNCERTAIN',
  UNKNOWN: 'UNKNOWN',
};

export const GapReason = {
  DIRECT_FACT: 'direct_fact',
  MULTI_HOP_PATH: 'multi_hop_path',
  UNKNOWN_ANCHOR: 'unknown_anchor',
  UNKNOWN_TARGET_TYPE: 'unknown_target_type',
  DISCONNECTED_TRAVERSAL: 'disconnected_traversal',
  TARGET_TYPE_MISMATCH: 'target_type_mismatch',
  COMPETING_HYPOTHESES: 'competing_hypotheses',
  LOW_CONFIDENCE: 'low_confidence',
};

export class EpistemicGapAnalyzer {
  constructor({ minVerifiedConfidence = 0.70, minViableConfidence = 0.35, minCompetingMargin = 0.15 } = {}) {
    this.minVerifiedConfidence = minVerifiedConfidence;
    this.minViableConfidence = minViableConfidence;
    this.minCompetingMargin = minCompetingMargin;
  }

  /**
   * Analyzes a ReasoningResult and query context to determine epistemic state
   * @param {object} reasoningResult - Structured result from GraphReasoner
   * @param {object} queryPlan - Plan from SemanticQueryParser
   * @returns {object} Structured Epistemic Analysis
   */
  analyze(reasoningResult, queryPlan = null) {
    // 1. Missing anchor entity in local registry
    if (!queryPlan || !queryPlan.anchorToken) {
      return {
        status: EpistemicStatus.UNKNOWN,
        reason: GapReason.UNKNOWN_ANCHOR,
        confidence: 0.0,
        shouldEscalate: true,
        localResult: null,
        description: 'Anchor entity not identified or not found in local TokenRegistry',
      };
    }

    // 2. Traversal produced no candidate path
    if (!reasoningResult || !reasoningResult.verified || !reasoningResult.answer) {
      return {
        status: EpistemicStatus.UNKNOWN,
        reason: GapReason.DISCONNECTED_TRAVERSAL,
        anchor: queryPlan.anchorToken,
        targetType: queryPlan.targetType,
        confidence: 0.0,
        shouldEscalate: true,
        localResult: reasoningResult,
        description: 'No semantically valid path found connecting anchor to target type in local graph',
      };
    }

    const conf = typeof reasoningResult.confidence === 'number' ? reasoningResult.confidence : 0.0;

    // 3. Check for competing hypotheses with narrow margin
    if (Array.isArray(reasoningResult.competingPaths) && reasoningResult.competingPaths.length > 1) {
      const topConf = reasoningResult.competingPaths[0]?.confidence || conf;
      const secondConf = reasoningResult.competingPaths[1]?.confidence || 0.0;
      const margin = topConf - secondConf;

      if (margin < this.minCompetingMargin && topConf < this.minVerifiedConfidence) {
        return {
          status: EpistemicStatus.UNCERTAIN,
          reason: GapReason.COMPETING_HYPOTHESES,
          anchor: queryPlan.anchorToken,
          targetType: queryPlan.targetType,
          confidence: conf,
          margin,
          shouldEscalate: true,
          localResult: reasoningResult,
          description: `Multiple competing paths found with close margin (${margin.toFixed(2)})`,
        };
      }
    }

    // 4. Low path confidence
    if (conf < this.minViableConfidence) {
      return {
        status: EpistemicStatus.UNKNOWN,
        reason: GapReason.LOW_CONFIDENCE,
        anchor: queryPlan.anchorToken,
        targetType: queryPlan.targetType,
        confidence: conf,
        shouldEscalate: true,
        localResult: reasoningResult,
        description: `Path confidence (${conf.toFixed(2)}) below minimum viable threshold (${this.minViableConfidence})`,
      };
    }

    // 5. Moderate confidence: UNCERTAIN but usable locally if no teacher available
    if (conf < this.minVerifiedConfidence) {
      return {
        status: EpistemicStatus.UNCERTAIN,
        reason: GapReason.LOW_CONFIDENCE,
        anchor: queryPlan.anchorToken,
        targetType: queryPlan.targetType,
        confidence: conf,
        shouldEscalate: false, // Usable locally unless teacher is explicitly solicited
        localResult: reasoningResult,
        description: `Moderate confidence path (${conf.toFixed(2)})`,
      };
    }

    // 6. High confidence: KNOWN verified path
    const reason = (reasoningResult.hopCount || 1) === 1 ? GapReason.DIRECT_FACT : GapReason.MULTI_HOP_PATH;
    return {
      status: EpistemicStatus.KNOWN,
      reason,
      anchor: queryPlan.anchorToken,
      targetType: queryPlan.targetType,
      confidence: conf,
      shouldEscalate: false,
      localResult: reasoningResult,
      description: `Verified ${reasoningResult.hopCount || 1}-hop path with high confidence (${conf.toFixed(2)})`,
    };
  }
}

export const defaultEpistemicGapAnalyzer = new EpistemicGapAnalyzer();
export default defaultEpistemicGapAnalyzer;
