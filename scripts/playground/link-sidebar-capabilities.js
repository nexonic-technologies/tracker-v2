import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const feedCapPath = path.resolve(__dirname, 'feed-capablities.json');
const childrenPath = path.resolve(__dirname, 'sidebar-childern.json');
const parentPath = path.resolve(__dirname, 'sidebar-parent.json');

const feedCaps = JSON.parse(fs.readFileSync(feedCapPath, 'utf8'));
const children = JSON.parse(fs.readFileSync(childrenPath, 'utf8'));
const parents = JSON.parse(fs.readFileSync(parentPath, 'utf8'));

// Build mapping from baseName.toLowerCase() -> list of capability _id strings
const capGroupMap = new Map();
feedCaps.forEach(cap => {
  const parts = cap.key.split(':');
  const base = parts[0].toLowerCase();
  if (!capGroupMap.has(base)) capGroupMap.set(base, []);
  capGroupMap.get(base).push(cap._id);
});

function getCapIdsForTitle(title) {
  if (!title) return [];
  let clean = title.replace(/\s+/g, '').toLowerCase();
  if (clean === 'dashboard') clean = 'dashboard';
  if (clean === 'feed') clean = 'feed';
  if (clean === 'time&attendance') clean = 'attendance';
  if (clean === 'projectmanagement') clean = 'tasks';
  if (clean === 'helpdesk') clean = 'tickets';
  if (clean === 'salesmanagement') clean = 'crm';
  if (clean === 'checkin') clean = 'checkin';
  if (clean === 'alltasks') clean = 'tasks';
  if (clean === 'alltickets') clean = 'tickets';
  if (clean === 'crmdashboard') clean = 'crm';
  if (clean === 'payrolldashboard') clean = 'payroll';

  if (capGroupMap.has(clean)) {
    return capGroupMap.get(clean);
  }
  // Try fallback substring or return empty
  for (const [key, ids] of capGroupMap.entries()) {
    if (clean.includes(key) || key.includes(clean)) {
      return ids;
    }
  }
  return [];
}

// Update parents
const updatedParents = parents.map(item => {
  const ids = getCapIdsForTitle(item.title);
  return {
    ...item,
    capabilities: ids.length > 0 ? ids : (item.capabilities || [])
  };
});

// Update children
const updatedChildren = children.map(item => {
  const ids = getCapIdsForTitle(item.title);
  return {
    ...item,
    capabilities: ids.length > 0 ? ids : (item.capabilities || [])
  };
});

fs.writeFileSync(parentPath, JSON.stringify(updatedParents, null, 4));
fs.writeFileSync(childrenPath, JSON.stringify(updatedChildren, null, 4));

console.log('Successfully linked capability ObjectIds to sidebar-parent.json and sidebar-childern.json');
