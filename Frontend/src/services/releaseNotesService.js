/**
 * releaseNotesService.js
 * Release notes manager with backend database persistence (Populate API)
 * and per-user local storage view capture.
 */

import axiosInstance from '../api/axiosInstance';
import staticReleaseNotes from '../constants/releaseNotes.json';

const STORAGE_KEY_PREFIX = 'tracker_seen_release_';

let cachedReleases = null;

/**
 * Fetch all published release notes from the database via the Populate API.
 * Falls back to bundled static notes if offline or during bootstrapping.
 * @returns {Promise<Array>}
 */
export async function fetchReleaseNotes() {
  try {
    const res = await axiosInstance.get('/populate/read/release_notes', {
      params: {
        filter: JSON.stringify({ isPublished: true, metaStatus: { $ne: 'deleted' } }),
        sort: JSON.stringify({ releaseDate: -1, createdAt: -1 }),
        limit: 50,
      },
    });

    const dbList = res.data?.data;
    if (Array.isArray(dbList) && dbList.length > 0) {
      cachedReleases = dbList.map((item) => ({
        _id: item._id,
        version: item.version,
        releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '',
        title: item.title,
        tagline: item.tagline || '',
        type: item.type || 'Platform Update',
        isLatest: Boolean(item.isLatest),
        categories: {
          features: item.categories?.features || [],
          improvements: item.categories?.improvements || [],
          security: item.categories?.security || [],
          fixes: item.categories?.fixes || [],
        },
      }));
      return cachedReleases;
    }
  } catch (err) {
    console.debug('[releaseNotesService] Populate API unavailable, using fallback:', err.message);
  }

  // Fallback to static bundled release notes
  cachedReleases = Array.isArray(staticReleaseNotes) ? staticReleaseNotes : [];
  return cachedReleases;
}

export function getCachedReleases() {
  return cachedReleases || staticReleaseNotes || [];
}

export function getLatestRelease() {
  const list = getCachedReleases();
  return list.length > 0 ? list[0] : null;
}

/**
 * Checks if the user has already viewed the given release version.
 * @param {string} userId - Current user ID or unique identifier
 * @param {string} version - Semantic version string (e.g., '3.1.4')
 * @returns {boolean}
 */
export function hasUserSeenRelease(userId, version) {
  if (!version) return true;
  try {
    const cleanVer = String(version).replace(/^v/, '');
    const key = `${STORAGE_KEY_PREFIX}${userId || 'global'}_v${cleanVer}`;
    return localStorage.getItem(key) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Marks the release version as viewed for the user in localStorage and optionally records view in DB.
 * @param {string} userId - Current user ID or unique identifier
 * @param {string} version - Semantic version string (e.g., '3.1.4')
 * @param {string} [releaseId] - MongoDB document ID if available
 */
export async function markReleaseAsSeen(userId, version, releaseId = null) {
  if (!version) return;
  const cleanVer = String(version).replace(/^v/, '');
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'global'}_v${cleanVer}`;
    localStorage.setItem(key, 'true');
    localStorage.setItem(`tracker_last_seen_release_ver_${userId || 'global'}`, cleanVer);
  } catch (e) {
    console.warn('Failed to save release note view state to localStorage:', e);
  }

  // Optionally record in database if user is authenticated
  if (userId && releaseId) {
    try {
      await axiosInstance.post(`/populate/update/release_notes/${releaseId}`, {
        $addToSet: {
          seenBy: { employeeId: userId, viewedAt: new Date() },
        },
      });
    } catch (_) {
      // Non-blocking
    }
  }
}

/**
 * Trigger opening the Release Notes modal from anywhere in the application.
 * @param {string} [targetVersion] - Optional specific version to focus on
 */
export function triggerReleaseNotesModal(targetVersion = null) {
  window.dispatchEvent(
    new CustomEvent('tracker:open-release-notes', {
      detail: { version: targetVersion },
    })
  );
}
