/**
 * Registry: populateRef
 * Handles population context for reference fields
 */
export default function populateRef(user, record, context = {}) {
  if (!user) return false;
  
  // This registry is used to identify when a read operation is for population
  // It returns true to indicate this is a population context
  return true;
}