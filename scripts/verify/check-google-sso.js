// scripts/verify/check-google-sso.js
// Run from Backend directory: node ../scripts/verify/check-google-sso.js
// Or from root:               node scripts/verify/check-google-sso.js --cwd Backend

"use strict";

const path  = require("path");
const fs    = require("fs");
const { createRequire } = require("module");

// ─── Resolve Backend root ────────────────────────────────────────────────────
const backendRoot = path.resolve(__dirname, "../../Backend");
const requireBackend = createRequire(path.join(backendRoot, "package.json"));

// ─── Load .env from Backend ──────────────────────────────────────────────────
requireBackend("dotenv").config({ path: path.join(backendRoot, ".env") });

let passed = 0;
let failed = 0;

function ok(msg)   { console.log("🟢 PASS: " + msg);  passed++; }
function fail(msg) { console.error("🔴 FAIL: " + msg); failed++; }
function info(msg) { console.log("ℹ️  " + msg); }

console.log("\n=== SSO BACKEND PHILOSOPHY AUDIT ===\n");

// ─── 1. Environment variable ─────────────────────────────────────────────────
info("1. Environment Variables");
if (!process.env.GOOGLE_CLIENT_ID) {
  fail("GOOGLE_CLIENT_ID is missing from Backend/.env");
} else {
  ok("GOOGLE_CLIENT_ID present: " + process.env.GOOGLE_CLIENT_ID.slice(0, 20) + "...");
}

// ─── 2. Route file contains /google ──────────────────────────────────────────
info("\n2. Route Definition");
const routesFile = path.join(backendRoot, "src/routes/authRoutes.js");
if (!fs.existsSync(routesFile)) {
  fail("authRoutes.js not found at " + routesFile);
} else {
  const routesSrc = fs.readFileSync(routesFile, "utf8");
  if (/router\.(post|get)\s*\(\s*["'`]\/google/.test(routesSrc)) {
    ok("authRoutes.js contains /google endpoint");
  } else {
    fail("authRoutes.js is missing the /google route — check authRoutes.js");
  }
  if (/googleLogin/.test(routesSrc)) {
    ok("authRoutes.js references googleLogin handler");
  } else {
    fail("authRoutes.js does not reference googleLogin handler");
  }
}

// ─── 3. Controller exports googleLogin ───────────────────────────────────────
info("\n3. Controller");
const controllerFile = path.join(backendRoot, "src/Controller/AuthController.js");
if (!fs.existsSync(controllerFile)) {
  fail("AuthController.js not found at " + controllerFile);
} else {
  const ctrlSrc = fs.readFileSync(controllerFile, "utf8");
  if (/exports\.googleLogin\s*=/.test(ctrlSrc) || /const\s+googleLogin/.test(ctrlSrc) || /function\s+googleLogin/.test(ctrlSrc)) {
    ok("AuthController.js defines googleLogin");
  } else {
    fail("AuthController.js does NOT define googleLogin — add the export");
  }
  if (/google-auth-library/.test(ctrlSrc)) {
    ok("AuthController.js imports google-auth-library");
  } else {
    fail("AuthController.js does NOT import google-auth-library");
  }
}

// ─── 4. google-auth-library installed ────────────────────────────────────────
info("\n4. Dependency Check");
const gauthPkg = path.join(backendRoot, "node_modules/google-auth-library/package.json");
if (fs.existsSync(gauthPkg)) {
  const ver = JSON.parse(fs.readFileSync(gauthPkg, "utf8")).version;
  ok("google-auth-library installed (v" + ver + ")");
} else {
  fail("google-auth-library NOT found in Backend/node_modules — run: npm install google-auth-library inside Backend/");
}

// ─── 5. Employee schema source check ─────────────────────────────────────────
info("\n5. Employee Schema");
const employeeFile = path.join(backendRoot, "src/models/Employee.js");
if (!fs.existsSync(employeeFile)) {
  fail("Employee.js model not found");
} else {
  const empSrc = fs.readFileSync(employeeFile, "utf8");
  if (/googleEmail/.test(empSrc)) {
    ok("Employee.js contains googleEmail field");
  } else {
    fail("Employee.js is missing googleEmail — add it to authInfo subdocument");
  }
  if (/googleLoginEnabled/.test(empSrc)) {
    ok("Employee.js contains googleLoginEnabled field");
  } else {
    fail("Employee.js is missing googleLoginEnabled — add it to authInfo subdocument");
  }
  if (/sparse\s*:\s*true/.test(empSrc)) {
    ok("Employee.js has sparse index (required to allow multiple null googleEmails)");
  } else {
    fail("Employee.js googleEmail index may be missing sparse:true — multiple nulls will clash");
  }
}

// ─── 6. Session schema source check ──────────────────────────────────────────
info("\n6. Session Schema");
const sessionFile = path.join(backendRoot, "src/models/Session.js");
if (!fs.existsSync(sessionFile)) {
  fail("Session.js model not found");
} else {
  const sessSrc = fs.readFileSync(sessionFile, "utf8");
  if (/authMethod/.test(sessSrc)) {
    ok("Session.js contains authMethod field");
  } else {
    fail("Session.js is missing authMethod tracking field");
  }
}

// ─── 7. Frontend env ─────────────────────────────────────────────────────────
info("\n7. Frontend Environment");
const feEnvFile = path.resolve(backendRoot, "../Frontend/.env");
if (!fs.existsSync(feEnvFile)) {
  fail("Frontend/.env not found at " + feEnvFile);
} else {
  const feEnv = fs.readFileSync(feEnvFile, "utf8");
  if (/VITE_GOOGLE_CLIENT_ID/.test(feEnv)) {
    ok("Frontend/.env contains VITE_GOOGLE_CLIENT_ID");
  } else {
    fail("Frontend/.env is missing VITE_GOOGLE_CLIENT_ID");
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n=== AUDIT COMPLETED ===");
console.log(`🟢 Passed: ${passed}  🔴 Failed: ${failed}`);

if (failed > 0) {
  console.log("\n⚠️  Fix the 🔴 items above then re-run the audit.");
  process.exit(1);
} else {
  console.log("\n✅ All checks passed — backend SSO integration is consistent.");
  process.exit(0);
}
