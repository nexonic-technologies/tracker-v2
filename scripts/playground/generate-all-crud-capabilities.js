import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const capPath = path.resolve(__dirname, 'capabilities.json');
const childrenPath = path.resolve(__dirname, 'sidebar-childern.json');
const parentPath = path.resolve(__dirname, 'sidebar-parent.json');
const updatedPath = path.resolve(__dirname, 'capablities-updated.json');

const origCap = fs.existsSync(capPath) ? JSON.parse(fs.readFileSync(capPath, 'utf8')) : [];
const children = fs.existsSync(childrenPath) ? JSON.parse(fs.readFileSync(childrenPath, 'utf8')) : [];
const parents = fs.existsSync(parentPath) ? JSON.parse(fs.readFileSync(parentPath, 'utf8')) : [];

// Collect all unique module bases
const moduleMap = new Map(); // keyBase -> { keyBase, label }

function formatLabel(str) {
  if (!str) return '';
  // Add space before capitals if camelCase
  const spaced = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// 1. From capabilities.json
origCap.forEach(item => {
  if (!item.key) return;
  const parts = item.key.split(':');
  let base = parts[0];
  // Normalize casing for known duplicates
  if (base.toLowerCase() === 'dashboard') base = 'Dashboard';
  if (base.toLowerCase() === 'tickets') base = 'Tickets';
  if (base.toLowerCase() === 'feed') base = 'Feed';
  if (base.toLowerCase() === 'menu') base = 'Menu';
  if (base.toLowerCase() === 'tasks' || base.toLowerCase() === 'task') base = 'Tasks';
  if (base.toLowerCase() === 'crm') base = 'CRM';

  let label = item.label ? item.label.replace(/^(View|Create|Update|Delete)\s+/i, '') : formatLabel(base);
  if (!label || label.trim() === '') label = formatLabel(base);

  if (!moduleMap.has(base.toLowerCase())) {
    moduleMap.set(base.toLowerCase(), { keyBase: base, label: label.trim() });
  }
});

// 2. From sidebar-parent.json
parents.forEach(p => {
  if (!p.title) return;
  let base = p.title.replace(/\s+/g, '');
  if (base.toLowerCase() === 'dashboard') base = 'Dashboard';
  if (base.toLowerCase() === 'feed') base = 'Feed';
  if (base.toLowerCase() === 'time&attendance') base = 'Attendance';
  if (base.toLowerCase() === 'projectmanagement') base = 'Tasks';
  if (base.toLowerCase() === 'helpdesk') base = 'Tickets';
  if (base.toLowerCase() === 'salesmanagement') base = 'CRM';

  if (!moduleMap.has(base.toLowerCase())) {
    moduleMap.set(base.toLowerCase(), { keyBase: base, label: p.title });
  }
});

// 3. From sidebar-childern.json
children.forEach(c => {
  if (!c.title) return;
  let base = c.title.replace(/\s+/g, '');
  if (base.toLowerCase() === 'checkin') base = 'CheckIn';

  if (!moduleMap.has(base.toLowerCase())) {
    moduleMap.set(base.toLowerCase(), { keyBase: base, label: c.title });
  }
});

// Generate 4 CRUD actions for every module base
const actions = [
  { action: 'view', prefix: 'View', keySuffix: 'view' },
  { action: 'create', prefix: 'Create', keySuffix: 'create' },
  { action: 'update', prefix: 'Update', keySuffix: 'update' },
  { action: 'delete', prefix: 'Delete', keySuffix: 'delete' }
];

const newCapabilities = [];

for (const { keyBase, label } of moduleMap.values()) {
  const nameBase = keyBase.toLowerCase();
  
  actions.forEach(({ action, prefix, keySuffix }) => {
    newCapabilities.push({
      key: `${keyBase}:${keySuffix}`,
      name: `${nameBase}.${keySuffix}`,
      action: action,
      label: `${prefix} ${label}`,
      description: `Access to ${prefix.toLowerCase()} ${label.toLowerCase()}`,
      status: 'active',
      type: 'ui'
    });
  });
}

fs.writeFileSync(updatedPath, JSON.stringify(newCapabilities, null, 4));
console.log(`Successfully generated ${newCapabilities.length} capabilities across ${moduleMap.size} modules.`);
