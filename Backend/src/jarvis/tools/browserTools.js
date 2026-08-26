import { STOP_WORDS } from '../tokens/TokenRegistry.js';

/**
 * Autonomous Browser & Knowledge Discovery Tool Suite
 * Provides external factual retrieval and information discovery for Epistemic Gaps.
 */
export const browserTools = [
  {
    name: 'browser.search',
    description: 'Searches the web/knowledge sources for factual information, entities, capitals, definitions, or documentation.',
    category: 'discovery',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string (e.g. "capital of India", "Tamil Nadu capital city")',
        },
        subject: {
          type: 'string',
          description: 'Target entity subject (e.g. "India")',
        },
        property: {
          type: 'string',
          description: 'Target property (e.g. "capital")',
        },
      },
      required: ['query'],
    },
    async handler({ query, subject, property } = {}, ctx) {
      let q = (query || ctx?.utterance || '').trim();
      q = q.replace(/^User\s+(?:Utterance|Question|Query):\s*"?/i, '').replace(/["']+$/i, '').trim();

      if (!q) {
        return {
          success: false,
          error: 'Search query is required',
        };
      }

      // Build prioritized search candidates:
      // 1. Explicit subject if provided
      // 2. Proper nouns / capitalized phrases in query (e.g. "Murnal Takur")
      // 3. Stopword-filtered keywords
      // 4. Full query string
      const candidates = [];
      if (subject && typeof subject === 'string' && subject.trim().length > 1) {
        candidates.push(subject.trim());
      }

      const properNouns = (q.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [])
        .filter((w) => !STOP_WORDS.has(w.toLowerCase()));
      for (const pn of properNouns) {
        if (!candidates.includes(pn)) candidates.push(pn);
      }

      const filteredKeywords = q
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => !STOP_WORDS.has(w.toLowerCase()) && w.length > 2)
        .join(' ');
      if (filteredKeywords && !candidates.includes(filteredKeywords)) {
        candidates.push(filteredKeywords);
      }

      if (!candidates.includes(q)) {
        candidates.push(q);
      }

      if (typeof fetch === 'function') {
        const headers = { 'User-Agent': 'WorkhubJarvisERP/1.0 (https://workhub.erp; jarvis@workhub.erp)' };

        for (const candidate of candidates) {
          try {
            // Strategy 1: Wikipedia OpenSearch API (Automatically corrects misspellings & fuzzy titles)
            const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(candidate)}&limit=3&namespace=0&format=json`;
            const openSearchRes = await fetch(openSearchUrl, { headers, signal: AbortSignal.timeout(3500) });
            if (openSearchRes.ok) {
              const openData = await openSearchRes.json();
              const matchedTitle = openData[1]?.[0];
              if (matchedTitle) {
                const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(matchedTitle)}`, {
                  headers,
                  signal: AbortSignal.timeout(3500),
                });
                if (sumRes.ok) {
                  const sumData = await sumRes.json();
                  if (sumData.extract) {
                    return {
                      success: true,
                      query: q,
                      searchedCandidate: candidate,
                      discovered: true,
                      title: sumData.title || matchedTitle,
                      fact: sumData.extract,
                      description: sumData.description || '',
                    };
                  }
                }
              }
            }

            // Strategy 2: Wikipedia Search Page REST API
            const searchRes = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(candidate)}&limit=1`, {
              headers,
              signal: AbortSignal.timeout(3500),
            });
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const topKey = searchData.pages?.[0]?.key;
              if (topKey) {
                const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topKey)}`, {
                  headers,
                  signal: AbortSignal.timeout(3500),
                });
                if (sumRes.ok) {
                  const sumData = await sumRes.json();
                  if (sumData.extract) {
                    return {
                      success: true,
                      query: q,
                      searchedCandidate: candidate,
                      discovered: true,
                      title: sumData.title || topKey,
                      fact: sumData.extract,
                      description: sumData.description || '',
                    };
                  }
                }
              }
            }

            // Strategy 3: DuckDuckGo Instant Answer API
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(candidate)}&format=json&no_html=1&skip_disambig=1`;
            const ddgRes = await fetch(ddgUrl, { headers, signal: AbortSignal.timeout(3000) });
            if (ddgRes.ok) {
              const ddgData = await ddgRes.json();
              const factText = ddgData.AbstractText || ddgData.Definition || ddgData.Answer;
              if (factText) {
                return {
                  success: true,
                  query: q,
                  searchedCandidate: candidate,
                  discovered: true,
                  title: ddgData.Heading || candidate,
                  fact: factText,
                  description: ddgData.AbstractSource || 'DuckDuckGo Knowledge',
                };
              }
            }
          } catch {
            // Continue to next candidate
          }
        }
      }

      return {
        success: true,
        query: q,
        discovered: false,
        fact: null,
      };
    },
  },
  {
    name: 'browser.fetchContent',
    description: 'Fetches clean text content from a web URL for ingestion and analysis.',
    category: 'discovery',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to retrieve' },
      },
      required: ['url'],
    },
    async execute({ url } = {}) {
      if (!url) return { error: 'URL is required' };
      try {
        if (typeof fetch === 'function') {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          const text = await res.text();
          return { success: true, url, content: text.slice(0, 5000) };
        }
      } catch (err) {
        return { success: false, url, error: err.message };
      }
      return { success: true, url, content: `Fetched content from ${url}` };
    },
  },
];

export default browserTools;
