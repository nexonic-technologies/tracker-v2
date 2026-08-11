import models from '../models/Collection.js';

import { getPolicy } from "../utils/cache.js";
import { clearNavigationCache } from "../utils/contextBuilder.js";

// REMOVED: Hardcoded ROUTE_MODEL_MAP
// Each SideBar document now has a `resourceKey` field that links directly to
// the access_policies modelName. The context builder (contextBuilder.js) handles
// the filtering for the /me/context endpoint. This service hook still handles
// the legacy /populate/read/sidebars endpoint used by the sidebar itself.

export default function () {
    return {





        // Clear in-memory navigation cache on any sidebar write
        // so next /auth/me/context call rebuilds from fresh DB data.
        afterCreate: async () => {
            clearNavigationCache();
        },

        afterUpdate: async () => {
            clearNavigationCache();
        },

        afterDelete: async () => {
            clearNavigationCache();
        }
    };
}
