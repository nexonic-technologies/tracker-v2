// ======================================================================
// Converts a full filter string like:
//   (status = Present || status = WFH) && age > 20 && date >= 2025-01-01
// Into a structured normalized filter tree like:
//   { operation: "$and", filters: [...] }
//
// NOTE: It does NOT interpret field/operator/value.
// All leaf expression parsing is completely delegated to parseExpr()
// ======================================================================

import { parseExpr } from "./parseExpr.js";


// ----------------------- Tokenizer -----------------------
// Produces tokens: EXPR, AND, OR, LPAREN, RPAREN
function tokenize(input) {
  const tokens = [];
  let buf = "";
  let i = 0;

  const pushBuf = () => {
    const trimmed = buf.trim();
    if (trimmed) tokens.push({ type: "EXPR", value: trimmed });
    buf = "";
  };

  // normalize accidental unicode ampersands & convert single & to &&
  input = input
    .replace(/＆/g, "&")            // full-width & → ASCII
    .replace(/(?<!&)&(?!&)/g, "&&") // single & → &&
    .trim();

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    // && operator
    if (ch === "&" && next === "&") {
      pushBuf();
      tokens.push({ type: "AND" });
      i += 2;
      continue;
    }

    // || operator
    if (ch === "|" && next === "|") {
      pushBuf();
      tokens.push({ type: "OR" });
      i += 2;
      continue;
    }

    // Parentheses
    if (ch === "(") {
      pushBuf();
      tokens.push({ type: "LPAREN" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      pushBuf();
      tokens.push({ type: "RPAREN" });
      i += 1;
      continue;
    }

    // Whitespace — now part of buffer (DO NOT pushBuf)
    if (/\s/.test(ch)) {
      buf += ch;
      i += 1;
      continue;
    }

    // Normal character → accumulate
    buf += ch;
    i += 1;
  }

  pushBuf();
  return tokens;
}


// ----------------------- AST Builder -----------------------
function buildAST(tokens) {
  const output = [];
  const opStack = [];

  const precedence = () => 1; // AND and OR equal, left associative

  const applyOp = () => {
    const opTok = opStack.pop();
    if (!opTok) return;

    const right = output.pop();
    const left = output.pop();
    if (!left || !right) return;

    output.push({
      type: "LOGIC",
      op: opTok.type, // AND / OR
      children: [left, right],
    });
  };

  for (const tok of tokens) {
    if (tok.type === "EXPR") {
      output.push({ type: "EXPR", value: tok.value });
      continue;
    }

    if (tok.type === "AND" || tok.type === "OR") {
      while (
        opStack.length &&
        (opStack[opStack.length - 1].type === "AND" ||
          opStack[opStack.length - 1].type === "OR") &&
        precedence(opStack[opStack.length - 1].type) >= precedence(tok.type)
      ) {
        applyOp();
      }
      opStack.push(tok);
      continue;
    }

    if (tok.type === "LPAREN") {
      opStack.push(tok);
      continue;
    }

    if (tok.type === "RPAREN") {
      while (opStack.length) {
        const top = opStack[opStack.length - 1];
        if (top.type === "LPAREN") {
          opStack.pop();
          break;
        }
        applyOp();
      }
      continue;
    }
  }

  while (opStack.length) applyOp();

  return output.length ? output[output.length - 1] : null;
}


// ----------------------- Normalizer -----------------------
function normalizeNode(node) {
  if (!node) return null;

  // Leaf expression → parseExpr()
  if (node.type === "EXPR") {
    return parseExpr(node.value);
  }

  // Logical group
  if (node.type === "LOGIC") {
    const op = node.op === "AND" ? "$and" : "$or";
    const filters = [];

    for (const child of node.children) {
      const normalized = normalizeNode(child);
      if (!normalized) continue;

      // flatten nested same ops
      if (normalized.operation === op && Array.isArray(normalized.filters)) {
        filters.push(...normalized.filters);
      } else {
        filters.push(normalized);
      }
    }

    if (!filters.length) return null;
    return { operation: op, filters };
  }

  return null;
}


// ----------------------- Public Function -----------------------
export function parseFilter(input) {
  if (!input || typeof input !== "string") return null;

  const tokens = tokenize(input);
  if (!tokens.length) return null;

  const ast = buildAST(tokens);
  const normalized = normalizeNode(ast);
  if (!normalized) return null;

  // if single leaf → wrap inside $and for consistent output shape
  if (!normalized.operation) {
    return { operation: "$and", filters: [normalized] };
  }

  return normalized;
}
