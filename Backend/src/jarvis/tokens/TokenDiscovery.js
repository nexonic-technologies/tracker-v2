/**
 * Concept & Token Discovery Engine
 */
export class TokenDiscovery {
  constructor({ registry } = {}) {
    this.registry = registry;
    this.stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from',
      'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'and', 'but', 'or', 'nor', 'so', 'yet',
      'i', 'me', 'we', 'us', 'you', 'he', 'him', 'she', 'they', 'them',
      'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'when', 'where',
      'do', 'does', 'did', 'doing', 'have', 'has', 'had', 'having',
      'can', 'could', 'shall', 'should', 'will', 'would', 'may', 'might', 'must',
      'am', 'if', 'as', 'until', 'while', 'because', 'name', 'know', 'think', 'say', 'said'
    ]);
  }

  discover(text) {
    if (!text || typeof text !== 'string') return [];

    const raw = text.trim();
    const discovered = [];
    const matchedRanges = [];

    // 1. Check candidate tokens using fast inverted index lookup
    if (this.registry) {
      const candidateTokens = this.registry.findCandidates(raw, { limit: 50, minScore: 0.1 });
      const sortedTokens = candidateTokens
        .filter((t) => t.status !== 'merged')
        .sort((a, b) => b.canonical.length - a.canonical.length);

      for (const token of sortedTokens) {
        const canonical = token.canonical;
        if (canonical.length < 2) continue;

        const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const isSingleWord = !canonical.includes(' ');
        const pattern = isSingleWord && canonical.length > 2
          ? `\\b${escaped}(?:s|es|d|ed|ing)?\\b`
          : `\\b${escaped}\\b`;
        const regex = new RegExp(pattern, 'gi');
        let match;

        while ((match = regex.exec(raw)) !== null) {
          const start = match.index;
          const end = start + match[0].length;

          const overlaps = matchedRanges.some(([rStart, rEnd]) => !(end <= rStart || start >= rEnd));
          if (!overlaps) {
            matchedRanges.push([start, end]);
            discovered.push({
              text: match[0],
              canonical: token.canonical,
              isKnown: true,
              token,
              range: [start, end],
            });
          }
        }
      }
    }

    // 2. Discover unknown candidate concepts from unmatched portions
    const entityRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    let match;
    while ((match = entityRegex.exec(raw)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matchedRanges.some(([rStart, rEnd]) => !(end <= rStart || start >= rEnd));
      if (!overlaps) {
        matchedRanges.push([start, end]);
        discovered.push({
          text: match[0],
          isKnown: false,
          candidateType: 'entity',
          range: [start, end],
        });
      }
    }

    const hyphenRegex = /\b[a-zA-Z0-9]+-[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*\b/g;
    while ((match = hyphenRegex.exec(raw)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matchedRanges.some(([rStart, rEnd]) => !(end <= rStart || start >= rEnd));
      if (!overlaps) {
        matchedRanges.push([start, end]);
        discovered.push({
          text: match[0],
          isKnown: false,
          candidateType: 'technical_term',
          range: [start, end],
        });
      }
    }

    const wordRegex = /\b[a-zA-Z0-9_]{2,}\b/g;
    while ((match = wordRegex.exec(raw)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matchedRanges.some(([rStart, rEnd]) => !(end <= rStart || start >= rEnd));
      if (!overlaps) {
        const word = match[0];
        const lower = word.toLowerCase();
        if (!this.stopWords.has(lower)) {
          matchedRanges.push([start, end]);
          discovered.push({
            text: word,
            isKnown: false,
            candidateType: 'concept',
            range: [start, end],
          });
        }
      }
    }

    return discovered.sort((a, b) => a.range[0] - b.range[0]);
  }
}

export default TokenDiscovery;
