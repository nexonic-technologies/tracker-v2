/**
 * userUtils.js
 * Declarative helpers to format user names and avatars from schema objects without ad-hoc branching.
 */

/**
 * Resolves a user or employee display name declaratively from schema contracts.
 * @param {Object|string} user - User/Employee/Agent document or populated ref
 * @param {string} fallback - Fallback label if no name is available
 * @returns {string}
 */
export function getUserDisplayName(user, fallback = '—') {
  if (!user || typeof user !== 'object') return fallback;

  const first = user.basicInfo?.firstName || user.firstName || '';
  const last = user.basicInfo?.lastName || user.lastName || '';
  const fullName = `${first} ${last}`.trim();

  return fullName || user.name || user.displayName || user.email?.split('@')[0] || fallback;
}

/**
 * Resolves user profile avatar URL or path.
 * @param {Object|string} user
 * @returns {string|null}
 */
export function getUserAvatar(user) {
  if (!user || typeof user !== 'object') return null;
  return user.basicInfo?.profileImage || user.profileImage || user.avatar || null;
}
