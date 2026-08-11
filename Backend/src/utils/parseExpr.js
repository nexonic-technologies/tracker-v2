// src/utils/parseExpr.js
// ======================================================================
//  Converts a raw expression like:  "field>=something"
//  → { field: "field", operator: "$gte", value: (converted type) }
// ======================================================================

import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

// Supported operators (same as old filterParser logic)
const OP_MAP = {
  "=": "$eq",
  "!=": "$ne",
  ">": "$gt",
  ">=": "$gte",
  "<": "$lt",
  "<=": "$lte",
};

// -------------------- ObjectId recognizers --------------------
function looksLikeObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

function isIdField(field) {
  return (
    field === "_id" ||
    field.toLowerCase().endsWith("id") ||     
    field.toLowerCase().includes("id")
  );
}

// -------------------- Value Type Converter --------------------
function convertValue(rawValue, field) {
  const value = rawValue.trim();

  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Null
  if (value === "null") return null;

  // ObjectId
  if (looksLikeObjectId(value) && isIdField(field)) {
    return new ObjectId(value);
  }

  // Number
  if (!isNaN(value) && value !== "") return Number(value);

  // Date (ISO-like)
  const date = new Date(value);
  if (!isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return date;
  }

  // Fallback (string)
  return value;
}

// -------------------- Expression Parser --------------------
export function parseExpr(expr) {
  if (!expr || typeof expr !== "string") return null;

  // Allow whitespace around expression (e.g., "( age >= 15 )")
  const clean = expr.trim();

  // Extract field, operator, and value
  // Example match: "age >= 15"
  const match = clean.match(/(.+?)(<=|>=|!=|=|<|>)(.+)/);
  if (!match) return null; // lenient: skip invalid

  const [, fieldRaw, opSymbol, valueRaw] = match;

  const field = fieldRaw.trim();
  const operator = OP_MAP[opSymbol];
  const value = convertValue(valueRaw, field);

  // Skip when something is broken
  if (!field || !operator || value === undefined) return null;

  // Leaf expression consumed by filterParser normalize()
  return { field, operator, value };
}
