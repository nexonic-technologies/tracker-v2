#!/usr/bin/env node
/**
 * scripts/version-tool.mjs
 * Centralized Version Management & Sync Tool for Workhub Tracker
 *
 * Usage:
 *   node scripts/version-tool.mjs get
 *   node scripts/version-tool.mjs bump patch|minor|major|<explicit-version>
 *   node scripts/version-tool.mjs sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const VERSION_FILE = path.join(ROOT_DIR, 'version.json');
const ROOT_PKG = path.join(ROOT_DIR, 'package.json');
const BACKEND_PKG = path.join(ROOT_DIR, 'Backend', 'package.json');
const FRONTEND_PKG = path.join(ROOT_DIR, 'Frontend', 'package.json');
const FRONTEND_PUBLIC_VERSION = path.join(ROOT_DIR, 'Frontend', 'public', 'version.json');
const BACKEND_RELEASE_NOTES = path.join(ROOT_DIR, 'Backend', 'src', 'constants', 'releaseNotes.json');
const MOBILE_PUBSPEC = path.join(ROOT_DIR, 'tracker_mobile', 'pubspec.yaml');

// ─── Semantic Version Helpers ──────────────────────────────────────────────────
export function parseSemVer(versionStr) {
  const match = String(versionStr).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/);
  if (!match) {
    throw new Error(`Invalid semver format: "${versionStr}". Expected format: X.Y.Z (e.g. 3.1.2)`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
    raw: versionStr
  };
}

export function compareSemVer(v1, v2) {
  const p1 = parseSemVer(v1);
  const p2 = parseSemVer(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;
  return 0;
}

export function bumpSemVer(currentVersion, bumpType) {
  const parsed = parseSemVer(currentVersion);
  let { major, minor, patch } = parsed;

  const type = bumpType.toLowerCase();
  if (type === 'patch') {
    patch += 1;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else {
    // Check if user passed explicit version string (e.g. "3.2.0")
    const explicit = parseSemVer(bumpType);
    return `${explicit.major}.${explicit.minor}.${explicit.patch}`;
  }

  return `${major}.${minor}.${patch}`;
}

// ─── Read & Sync Core Logic ───────────────────────────────────────────────────
export function getRootVersionConfig() {
  if (!fs.existsSync(VERSION_FILE)) {
    throw new Error(`Root version configuration not found at: ${VERSION_FILE}`);
  }
  const content = fs.readFileSync(VERSION_FILE, 'utf8');
  return JSON.parse(content);
}

export function saveRootVersionConfig(config) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

export function syncAllPackages(targetVersion) {
  const results = [];

  // 0. Sync root package.json
  if (fs.existsSync(ROOT_PKG)) {
    const pkg = JSON.parse(fs.readFileSync(ROOT_PKG, 'utf8'));
    pkg.version = targetVersion;
    fs.writeFileSync(ROOT_PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    results.push(`package.json (root) -> ${targetVersion}`);
  }

  // 1. Sync Backend/package.json
  if (fs.existsSync(BACKEND_PKG)) {
    const pkg = JSON.parse(fs.readFileSync(BACKEND_PKG, 'utf8'));
    pkg.version = targetVersion;
    fs.writeFileSync(BACKEND_PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    results.push(`Backend/package.json -> ${targetVersion}`);
  }

  // 2. Sync Frontend/package.json
  if (fs.existsSync(FRONTEND_PKG)) {
    const pkg = JSON.parse(fs.readFileSync(FRONTEND_PKG, 'utf8'));
    pkg.version = targetVersion;
    fs.writeFileSync(FRONTEND_PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    results.push(`Frontend/package.json -> ${targetVersion}`);
  }

  // 3. Sync Frontend/public/version.json
  const publicDir = path.dirname(FRONTEND_PUBLIC_VERSION);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicVersionData = {
    version: targetVersion,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(FRONTEND_PUBLIC_VERSION, JSON.stringify(publicVersionData, null, 2) + '\n', 'utf8');
  results.push(`Frontend/public/version.json -> ${targetVersion}`);

  // 4. Sync Mobile pubspec.yaml if exists
  if (fs.existsSync(MOBILE_PUBSPEC)) {
    let pubspec = fs.readFileSync(MOBILE_PUBSPEC, 'utf8');
    const versionMatch = pubspec.match(/^version:\s*([^\r\n]+)/m);
    if (versionMatch) {
      const parts = versionMatch[1].split('+');
      const buildNumber = parts[1] ? `+${parts[1]}` : '+1';
      pubspec = pubspec.replace(/^version:\s*([^\r\n]+)/m, `version: ${targetVersion}${buildNumber}`);
      fs.writeFileSync(MOBILE_PUBSPEC, pubspec, 'utf8');
      results.push(`tracker_mobile/pubspec.yaml -> ${targetVersion}${buildNumber}`);
    }
  }

  // 5. Sync & update Release Notes schema
  let releaseNotes = [];
  if (fs.existsSync(BACKEND_RELEASE_NOTES)) {
    try {
      releaseNotes = JSON.parse(fs.readFileSync(BACKEND_RELEASE_NOTES, 'utf8'));
    } catch (_) {
      releaseNotes = [];
    }
  }

  let noteEntry = releaseNotes.find(r => r.version === targetVersion);
  if (!noteEntry) {
    noteEntry = {
      version: targetVersion,
      releaseDate: new Date().toISOString().split('T')[0],
      title: `Release v${targetVersion}`,
      tagline: 'Platform enhancements and continuous improvements.',
      isLatest: true,
      type: 'Feature & Maintenance Release',
      categories: {
        features: [],
        improvements: [`Release increment to v${targetVersion}`],
        security: [],
        fixes: []
      }
    };
    // Mark previous as non-latest
    releaseNotes.forEach(r => { r.isLatest = false; });
    releaseNotes.unshift(noteEntry);
  } else {
    // Ensure isLatest flag is set on targetVersion
    releaseNotes.forEach(r => {
      r.isLatest = (r.version === targetVersion);
    });
  }

  fs.writeFileSync(BACKEND_RELEASE_NOTES, JSON.stringify(releaseNotes, null, 2) + '\n', 'utf8');
  results.push(`Backend/src/constants/releaseNotes.json -> v${targetVersion}`);

  return results;
}

// ─── CLI Entrypoint ────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'get';

  try {
    const config = getRootVersionConfig();

    if (command === 'get') {
      console.log(`Current Project Version: ${config.version}`);
      console.log(`Updated At: ${config.updatedAt || 'N/A'}`);
      return;
    }

    if (command === 'sync') {
      console.log(`🔄 Synchronizing version ${config.version} across all sub-projects...`);
      const syncLogs = syncAllPackages(config.version);
      syncLogs.forEach(log => console.log(`  ✅ ${log}`));
      console.log(`\n🎉 All packages successfully synchronized to v${config.version}`);
      return;
    }

    if (command === 'bump') {
      const bumpArg = args[1];
      if (!bumpArg) {
        console.error('❌ Error: Specify bump type: patch | minor | major | <explicit-version>');
        process.exit(1);
      }

      const oldVersion = config.version;
      const newVersion = bumpSemVer(oldVersion, bumpArg);

      if (compareSemVer(newVersion, oldVersion) <= 0 && bumpArg !== 'patch' && bumpArg !== 'minor' && bumpArg !== 'major') {
        console.error(`❌ Error: New version (${newVersion}) must be higher than current version (${oldVersion})`);
        process.exit(1);
      }

      config.version = newVersion;
      config.updatedAt = new Date().toISOString();
      saveRootVersionConfig(config);

      console.log(`🚀 Bumped version: v${oldVersion} -> v${newVersion}`);
      const syncLogs = syncAllPackages(newVersion);
      syncLogs.forEach(log => console.log(`  ✅ ${log}`));
      console.log(`\n🎉 Centralized version updated and synchronized!`);
      return;
    }

    console.error(`❌ Unknown command: "${command}". Available commands: get, bump, sync`);
    process.exit(1);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
