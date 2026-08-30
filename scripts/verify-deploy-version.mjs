#!/usr/bin/env node
/**
 * scripts/verify-deploy-version.mjs
 * Deployment Verification Gate for Render (Backend) and Vercel (Frontend)
 *
 * Verifies that the version being deployed is strictly higher than the currently
 * live/deployed version. If not higher, the process exits with code 1, rejecting the build.
 *
 * Usage:
 *   node scripts/verify-deploy-version.mjs --target=backend
 *   node scripts/verify-deploy-version.mjs --target=frontend
 *   node scripts/verify-deploy-version.mjs --target=backend --live-url=https://custom-url/api/version
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DEFAULT_ENDPOINTS = {
  backend: process.env.BACKEND_LIVE_URL || 'https://tracker-1k2l.onrender.com/api/version',
  frontend: process.env.FRONTEND_LIVE_URL || 'https://workhub-teal-gamma.vercel.app/version.json'
};

// ─── Semantic Version Parser & Comparator ─────────────────────────────────────
function parseSemVer(versionStr) {
  if (!versionStr) return null;
  const match = String(versionStr).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: versionStr
  };
}

function compareSemVer(v1, v2) {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);

  if (!p1 || !p2) {
    throw new Error(`Cannot compare invalid semver versions: "${v1}" vs "${v2}"`);
  }

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;
  return 0;
}

// ─── HTTP Fetch Helper ────────────────────────────────────────────────────────
function fetchRemoteJson(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Tracker-Deploy-Gate/1.0' } }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(body);
              resolve({ ok: true, statusCode: res.statusCode, data });
            } catch (err) {
              resolve({ ok: false, statusCode: res.statusCode, error: `Invalid JSON response: ${body.slice(0, 100)}` });
            }
          } else {
            resolve({ ok: false, statusCode: res.statusCode, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ ok: false, error: `Connection timed out after ${timeoutMs}ms` });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

// ─── Local Version Reader ─────────────────────────────────────────────────────
function getLocalVersion(target) {
  // 1. Try root version.json
  const rootVersionPath = path.join(ROOT_DIR, 'version.json');
  if (fs.existsSync(rootVersionPath)) {
    const config = JSON.parse(fs.readFileSync(rootVersionPath, 'utf8'));
    if (config.version) return config.version;
  }

  // 2. Try target package.json
  const targetDir = target === 'frontend' ? 'Frontend' : 'Backend';
  const pkgPath = path.join(ROOT_DIR, targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) return pkg.version;
  }

  throw new Error(`Unable to determine local version for target "${target}". Checked: ${rootVersionPath} and ${pkgPath}`);
}

// ─── Main Verification Logic ──────────────────────────────────────────────────
async function runGate() {
  const args = process.argv.slice(2);
  let target = 'backend';
  let liveUrl = null;

  let rootConfig = {};
  const rootVersionPath = path.join(ROOT_DIR, 'version.json');
  if (fs.existsSync(rootVersionPath)) {
    try {
      rootConfig = JSON.parse(fs.readFileSync(rootVersionPath, 'utf8'));
    } catch {}
  }

  let bypass = process.env.FORCE_DEPLOY === 'true' || 
               process.env.BYPASS_VERSION_GATE === 'true' ||
               rootConfig.forceDeploy === true ||
               rootConfig.FORCE_DEPLOY === true;

  for (const arg of args) {
    if (arg.startsWith('--target=')) target = arg.split('=')[1].toLowerCase();
    if (arg.startsWith('--live-url=')) liveUrl = arg.split('=')[1];
    if (arg === '--bypass-gate' || arg === '--force') bypass = true;
  }

  console.log(`\n========================================================================`);
  console.log(` 🛡️  DEPLOYMENT VERSION VERIFICATION GATE`);
  console.log(` Target Service : ${target.toUpperCase()}`);
  console.log(`========================================================================`);

  if (bypass) {
    console.log(`⚠️  [GATE BYPASS ACTIVATED] FORCE_DEPLOY or --bypass-gate flag detected.`);
    console.log(`✅ Allowing deployment to proceed without version check.`);
    console.log(`========================================================================\n`);
    process.exit(0);
  }

  const newVersion = getLocalVersion(target);
  const targetEndpoint = liveUrl || DEFAULT_ENDPOINTS[target] || DEFAULT_ENDPOINTS.backend;

  console.log(`📦 Codebase Version to Deploy : v${newVersion}`);
  console.log(`🌐 Querying Live Endpoint     : ${targetEndpoint}`);

  const liveResponse = await fetchRemoteJson(targetEndpoint);

  if (!liveResponse.ok) {
    console.log(`\nℹ️  Notice: Could not fetch active live version (${liveResponse.error || `HTTP ${liveResponse.statusCode}`}).`);
    console.log(`   This is expected for initial deployments or offline endpoints.`);
    console.log(`✅ Proceeding with deployment: v${newVersion}`);
    console.log(`========================================================================\n`);
    process.exit(0);
  }

  const liveData = liveResponse.data;
  const liveVersion = liveData?.version;

  if (!liveVersion) {
    console.log(`\n⚠️  Live endpoint responded but did not contain a "version" field.`);
    console.log(`✅ Proceeding with deployment: v${newVersion}`);
    console.log(`========================================================================\n`);
    process.exit(0);
  }

  console.log(`🔍 Currently Live Version    : v${liveVersion}`);

  try {
    const comparison = compareSemVer(newVersion, liveVersion);

    if (comparison > 0) {
      console.log(`\n✅ [DEPLOYMENT APPROVED]`);
      console.log(`   New version v${newVersion} is higher than live version v${liveVersion}.`);
      console.log(`   Proceeding with build & deploy.`);
      console.log(`========================================================================\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ [DEPLOYMENT REJECTED & BLOCKED]`);
      console.error(`   Attempted version (v${newVersion}) is NOT higher than currently live version (v${liveVersion}).`);
      console.error(`   Only higher version increments (SemVer > v${liveVersion}) are accepted.`);
      console.error(`\n👉 How to fix:`);
      console.error(`   1. Run: npm run version:bump patch  (or minor / major)`);
      console.error(`   2. Commit and push the updated version.json to trigger deployment.`);
      console.error(`   (Or set FORCE_DEPLOY=true in Render/Vercel environment variables for emergency hotfixes).`);
      console.error(`========================================================================\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Version comparison error: ${err.message}`);
    process.exit(1);
  }
}

runGate();
