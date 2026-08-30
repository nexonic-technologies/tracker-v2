// src/scripts/seedReleaseNotes.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const RELEASE_NOTES_FILE = path.join(ROOT_DIR, 'Frontend', 'src', 'constants', 'releaseNotes.json');

export async function seedReleaseNotesForTenant(tenantModels, dbName = 'default') {
  if (!tenantModels || !tenantModels.release_notes) {
    return { count: 0, skipped: true };
  }

  let notes = [];
  try {
    if (fs.existsSync(RELEASE_NOTES_FILE)) {
      const content = fs.readFileSync(RELEASE_NOTES_FILE, 'utf8');
      notes = JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[seedReleaseNotes] Could not read ${RELEASE_NOTES_FILE}:`, err.message);
  }

  if (!Array.isArray(notes) || notes.length === 0) {
    return { count: 0, skipped: true };
  }

  let seededCount = 0;
  for (const item of notes) {
    const existing = await tenantModels.release_notes.findOne({ version: item.version });
    if (!existing) {
      await tenantModels.release_notes.create({
        version: item.version,
        releaseDate: item.releaseDate ? new Date(item.releaseDate) : new Date(),
        title: item.title || `Release v${item.version}`,
        tagline: item.tagline || '',
        type: item.type || 'Feature & Maintenance Release',
        isLatest: Boolean(item.isLatest),
        isPublished: true,
        categories: {
          features: item.categories?.features || [],
          improvements: item.categories?.improvements || [],
          security: item.categories?.security || [],
          fixes: item.categories?.fixes || [],
        },
        metaStatus: 'active',
      });
      seededCount++;
    }
  }

  return { count: seededCount, total: notes.length };
}
