/**
 * Registry: isRef
 * Allows reference access to basic employee information for dropdowns, contacts, etc.
 * Returns true for any authenticated user to access basic employee info
 */
export default function isRef(user, record, context = {}) {
  if (!user) return false;
  
  // Allow any authenticated user to access basic employee reference data
  // This is used for dropdowns, contact lists, team member references, etc.
  return true;
}