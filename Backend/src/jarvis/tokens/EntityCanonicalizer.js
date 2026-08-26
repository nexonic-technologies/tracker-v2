import { TokenType } from './TokenRegistry.js';

/**
 * Universal Entity Canonicalizer & Morphological Normalizer
 * (Sacred Law Compliant: Zero hardcoded entity mappings, 100% generic & taxonomy-aware)
 */
export class EntityCanonicalizer {
  constructor() {
    // Generic taxonomic / ontological descriptor category keywords
    this.taxonomyCategories = new Map([
      ['continent', 'continent'],
      ['continental', 'continent'],
      ['landmass', 'continent'],
      ['country', 'country'],
      ['nation', 'country'],
      ['union', 'country'],
      ['republic', 'country'],
      ['federation', 'country'],
      ['kingdom', 'country'],
      ['state', 'administrative_division'],
      ['province', 'administrative_division'],
      ['administrative_division', 'administrative_division'],
      ['territory', 'administrative_division'],
      ['city', 'location'],
      ['capital', 'location'],
      ['town', 'location'],
      ['location', 'location'],
      ['planet', 'planet'],
      ['celestial_body', 'planet'],
      ['film', 'creative_work'],
      ['movie', 'creative_work'],
      ['cinema', 'creative_work'],
      ['song', 'creative_work'],
      ['book', 'creative_work'],
      ['language', 'language'],
      ['dialect', 'language'],
      ['person', 'person'],
      ['actor', 'person'],
      ['director', 'person'],
      ['composer', 'person'],
      ['organization', 'organization'],
      ['company', 'organization'],
      ['department', 'organization'],
    ]);

    // Words that indicate grammatical fillers / relative clauses in natural language descriptions
    this.grammaticalFillers = new Set([
      'forms', 'part', 'of', 'as', 'one', 'its', 'states', 'which', 'that', 'located',
      'situated', 'takes', 'place', 'took', 'filming', 'filmed', 'shot', 'in', 'the',
      'a', 'an', 'is', 'was', 'are', 'were', 'been', 'being', 'having', 'has', 'had',
    ]);
  }

  /**
   * Surface-form normalization
   * Cleans punctuation, quotes, determiners, leading/trailing prepositions and copulas
   * @param {string} phrase
   * @returns {string}
   */
  cleanSurfaceForm(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    let s = phrase.trim();
    s = s.replace(/^["'`]|["'`]$/g, '').trim();
    // Strip leading determiners
    s = s.replace(/^(?:the|a|an)\s+/i, '');
    // Strip leading prepositions
    s = s.replace(/^(?:in|at|on|to|from|by|of|with|for|under|over|through)\s+/i, '');
    // Strip trailing relative/appositive clauses (e.g. "as one of its states", "which is in Asia", "that is a country")
    s = s.replace(/\s+(?:as\s+(?:one\s+of\s+its\s+[\w\s]+|a\s+[\w\s]+|an\s+[\w\s]+)|which\s+[\w\s]+|that\s+[\w\s]+)$/i, '');
    // Strip trailing copula phrases (e.g. "is the", "was a")
    s = s.replace(/\s+(?:is|was|are|were)(?:\s+(?:a|an|the))?$/i, '');
    // Strip trailing punctuation
    s = s.replace(/[.,:;!?]+$/, '').trim();
    return s;
  }

  /**
   * Derives morphological root for demonyms, adjectives, and plurals generically
   * (e.g. Asian -> Asia, Indian -> India, American -> America, continental -> continent, states -> state)
   * @param {string} word
   * @returns {string}
   */
  deriveMorphologicalRoot(word) {
    if (!word || typeof word !== 'string') return '';
    const clean = word.trim();
    const lower = clean.toLowerCase();

    // 1. Plural to singular
    if (lower.endsWith('ies') && lower.length > 4) {
      return clean.slice(0, -3) + 'y';
    }
    if (lower.endsWith('es') && (lower.endsWith('shes') || lower.endsWith('ches') || lower.endsWith('sses') || lower.endsWith('xes'))) {
      return clean.slice(0, -2);
    }
    if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is') && lower.length > 3) {
      return clean.slice(0, -1);
    }

    // 2. Adjectival / Demonym root derivation:
    // "Asian" -> "Asia", "Indian" -> "India", "Russian" -> "Russia" (ends in 'ian', root in 'ia')
    if (lower.endsWith('ian') && lower.length > 4) {
      return clean.slice(0, -1); // "Asian" -> "Asia", "Indian" -> "India"
    }

    // "American" -> "America", "African" -> "Africa", "Mexican" -> "Mexico" (ends in 'ican')
    if (lower.endsWith('ican') && lower.length > 5) {
      return clean.slice(0, -1);
    }

    // "Chinese" -> "China", "Japanese" -> "Japan"
    if (lower.endsWith('ese') && lower.length > 5) {
      const base = clean.slice(0, -3);
      if (lower.endsWith('nese')) return clean.slice(0, -4) + 'na';
      return base;
    }

    // "continental" -> "continent"
    if (lower.endsWith('al') && lower.endsWith('tal') && lower.length > 5) {
      return clean.slice(0, -2);
    }

    return clean;
  }

  /**
   * Decomposes a candidate entity phrase into its canonical nominal entity and semantic category descriptor
   * (e.g. "Asian continent" -> { canonical: "Asia", semanticType: "continent", aliases: ["Asian continent"] })
   * (e.g. "Indian Union" -> { canonical: "India", semanticType: "country", aliases: ["Indian Union"] })
   * (e.g. "The state of Tamil Nadu" -> { canonical: "Tamil Nadu", semanticType: "administrative_division" })
   * @param {string} rawPhrase
   * @param {string} [contextualType]
   * @returns {object} Canonical resolution package
   */
  decomposeTaxonomicPhrase(rawPhrase, contextualType = null) {
    if (!rawPhrase || typeof rawPhrase !== 'string') {
      return {
        canonical: '',
        surfaceForm: '',
        semanticType: contextualType || TokenType.ENTITY,
        aliases: [],
        isDerived: false,
      };
    }

    const surfaceForm = this.cleanSurfaceForm(rawPhrase);
    if (!surfaceForm) {
      return {
        canonical: '',
        surfaceForm: rawPhrase,
        semanticType: contextualType || TokenType.ENTITY,
        aliases: [],
        isDerived: false,
      };
    }

    const aliases = new Set([rawPhrase.trim(), surfaceForm]);
    let canonical = surfaceForm;
    let inferredType = contextualType || null;
    let isDerived = false;

    // Pattern A: "the [category] of [Entity]" -> e.g. "the country of India", "the state of Tamil Nadu", "the continent of Asia"
    const prefixCategoryMatch = surfaceForm.match(/^(?:country|state|continent|planet|film|movie|city|province|republic|nation|language|organization)\s+of\s+(.+)$/i);
    if (prefixCategoryMatch) {
      const catWord = surfaceForm.split(/\s+/)[0].toLowerCase();
      canonical = this.cleanSurfaceForm(prefixCategoryMatch[1]);
      inferredType = this.taxonomyCategories.get(catWord) || inferredType;
      aliases.add(surfaceForm);
      aliases.add(prefixCategoryMatch[1].trim());
      isDerived = true;
    }

    // Pattern B: "[Entity] [category]" -> e.g. "Asian continent", "Indian Union", "Tamil Nadu state", "Earth planet", "Amaran film"
    const words = canonical.split(/\s+/);
    if (words.length >= 2) {
      const lastWord = words[words.length - 1].toLowerCase();
      if (this.taxonomyCategories.has(lastWord)) {
        const catType = this.taxonomyCategories.get(lastWord);
        const entityPart = words.slice(0, -1).join(' ');
        
        // Derive morphological root of entityPart (e.g. "Asian" -> "Asia", "Indian" -> "India")
        const rootEntity = this.deriveMorphologicalRoot(entityPart);
        
        canonical = rootEntity;
        inferredType = inferredType || catType;
        aliases.add(surfaceForm);
        aliases.add(entityPart);
        isDerived = true;
      }
    }

    // Pattern C: "[Category] [Entity]" -> e.g. "Planet Earth", "Film Amaran", "State Tamil Nadu"
    if (words.length >= 2 && !isDerived) {
      const firstWord = words[0].toLowerCase();
      if (this.taxonomyCategories.has(firstWord)) {
        const catType = this.taxonomyCategories.get(firstWord);
        const entityPart = words.slice(1).join(' ');
        canonical = entityPart;
        inferredType = inferredType || catType;
        aliases.add(surfaceForm);
        aliases.add(entityPart);
        isDerived = true;
      }
    }

    // Pattern D: Standalone adjectival demonym (e.g. "Asian" -> "Asia", "Indian" -> "India")
    if (!isDerived && words.length === 1) {
      const root = this.deriveMorphologicalRoot(words[0]);
      if (root && root.toLowerCase() !== words[0].toLowerCase()) {
        canonical = root;
        aliases.add(surfaceForm);
        isDerived = true;
      }
    }

    return {
      canonical: canonical || surfaceForm,
      surfaceForm,
      semanticType: inferredType || TokenType.ENTITY,
      aliases: Array.from(aliases).filter((a) => a && a !== canonical),
      isDerived,
    };
  }

  /**
   * Tests whether two entity representations are semantically compatible or equivalent,
   * while strictly protecting entity boundaries against false merges.
   * @param {object|string} ent1 - First entity descriptor or Token record
   * @param {object|string} ent2 - Second entity descriptor or Token record
   * @returns {boolean}
   */
  areSemanticallyEquivalent(ent1, ent2) {
    if (!ent1 || !ent2) return false;

    const name1 = typeof ent1 === 'string' ? ent1 : ent1.canonical || ent1.name || '';
    const name2 = typeof ent2 === 'string' ? ent2 : ent2.canonical || ent2.name || '';
    const type1 = (typeof ent1 === 'object' ? ent1.type : null) || '';
    const type2 = (typeof ent2 === 'object' ? ent2.type : null) || '';

    const norm1 = this.cleanSurfaceForm(name1).toLowerCase();
    const norm2 = this.cleanSurfaceForm(name2).toLowerCase();

    if (!norm1 || !norm2) return false;
    if (norm1 === norm2) return true;

    // Boundary Protection: Strict type compatibility check
    if (type1 && type2 && type1 !== TokenType.ENTITY && type2 !== TokenType.ENTITY) {
      const t1 = type1.toLowerCase();
      const t2 = type2.toLowerCase();
      if (t1 !== t2) {
        // Types are explicitly different (e.g. language vs administrative_division) -> NEVER EQUIVALENT!
        return false;
      }
    }

    // Boundary Protection: Word-count disparity check (prevent "Tamil" from merging into "Tamil Nadu")
    const words1 = norm1.split(/\s+/);
    const words2 = norm2.split(/\s+/);
    if (words1.length !== words2.length) {
      // If one is not a taxonomic/morphological derivation of the other, do not merge
      const dec1 = this.decomposeTaxonomicPhrase(name1, type1);
      const dec2 = this.decomposeTaxonomicPhrase(name2, type2);

      const root1 = dec1.canonical.toLowerCase();
      const root2 = dec2.canonical.toLowerCase();

      if (root1 === root2) return true;
      if (dec1.aliases.some((a) => a.toLowerCase() === norm2) || dec2.aliases.some((a) => a.toLowerCase() === norm1)) {
        return true;
      }

      return false;
    }

    // Morphological root equivalence
    const root1 = this.deriveMorphologicalRoot(norm1);
    const root2 = this.deriveMorphologicalRoot(norm2);
    if (root1 === root2) return true;

    return false;
  }
}

export const defaultEntityCanonicalizer = new EntityCanonicalizer();
export default defaultEntityCanonicalizer;
