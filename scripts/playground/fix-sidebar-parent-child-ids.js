import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parentPath = path.resolve(__dirname, 'sidebar-parent.json');
const childrenPath = path.resolve(__dirname, 'sidebar-childern.json');

const parents = JSON.parse(fs.readFileSync(parentPath, 'utf8'));
const children = JSON.parse(fs.readFileSync(childrenPath, 'utf8'));

// Map title -> stable fixed _id
const parentIdMap = {
  'Dashboard': '6a659f888d8a0317a6a4b5e0',
  'Time & Attendance': '6a659f888d8a0317a6a4b5e1',
  'Project Management': '6a659f888d8a0317a6a4b5e2',
  'Helpdesk': '6a659f888d8a0317a6a4b5e3',
  'Sales Management': '6a659f888d8a0317a6a4b5e4',
  'Accounts': '6a659f888d8a0317a6a4b5e5',
  'Assets': '6a659f888d8a0317a6a4b5e6',
  'HRMS': '6a659f888d8a0317a6a4b5e7',
  'Payroll': '6a659f888d8a0317a6a4b5e8',
  'Profile': '6a659f888d8a0317a6a4b5e9',
  'Reports': '6a659f888d8a0317a6a4b5ea',
  'Settings': '6a659f888d8a0317a6a4b5eb',
  'Feed': '6a659f888d8a0317a6a4b5ec'
};

// 1. Assign fixed _id to parent items
const updatedParents = parents.map(p => {
  const fixedId = parentIdMap[p.title];
  return {
    _id: fixedId || p._id,
    ...p
  };
});

// 2. Ensure children have correct matching parentId
const updatedChildren = children.map(c => {
  let parentTitle = null;
  const route = c.mainRoute || '';
  if (route.startsWith('/attendance')) parentTitle = 'Time & Attendance';
  else if (route.startsWith('/tasks')) parentTitle = 'Project Management';
  else if (route.startsWith('/tickets')) parentTitle = 'Helpdesk';
  else if (route.startsWith('/crm')) parentTitle = 'Sales Management';
  else if (route.startsWith('/accounts')) parentTitle = 'Accounts';
  else if (route.startsWith('/assets')) parentTitle = 'Assets';
  else if (route.startsWith('/payroll')) parentTitle = 'Payroll';
  else if (route.startsWith('/settings')) parentTitle = 'Settings';

  const correctParentId = parentTitle ? parentIdMap[parentTitle] : c.parentId;

  return {
    ...c,
    parentId: correctParentId
  };
});

fs.writeFileSync(parentPath, JSON.stringify(updatedParents, null, 4));
fs.writeFileSync(childrenPath, JSON.stringify(updatedChildren, null, 4));

console.log('Fixed parent _ids and child parentIds successfully.');
