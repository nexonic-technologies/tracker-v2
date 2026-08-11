import isSelf from "./isSelf.js";
import isTeamMember from "./isTeamMember.js";
import isAssigned from "./isAssigned.js";
import isCreatedBy from "./isCreatedBy.js";
import isRecipient from "./isRecipient.js";
import isRef from "./isRef.js";
import isSender from "./isSender.js";
import populateRef from "./populateRef.js";
import isSameClient from "./isSameClient.js";
import isAllocatedTo from "./isAllocatedTo.js";

// Registry of reusable logic functions for policies
// Each function behaves like a "Computed Filter" or "Runtime Check"

// Function Signature: (user, record, context) => boolean | mongoFilterObject
// - If it returns a Boolean: True = Allow, False = Deny (used for single record checks)
// - If it returns an Object: It's treated as a Mongo query filter (used for list/find queries)

const registry = {
  isSelf,
  isTeamMember,
  isAssigned,
  isCreatedBy,
  isRecipient,
  isRef,
  isSender,
  populateRef,
  isSameClient,
  isAllocatedTo,
  
  isManager: (user, record, context) => {
    // Check if user is a manager (logic depends on your hierarchy)
    if (!user) return false;

    // Simple filter: Records where reportingManager is the user
    return {
      $or: [
        { reportingManager: user.id },
        { "professionalInfo.reportingManager": user.id }
      ]
    };
  },

  // Dynamic Sidebar Visibility (Dept + Designation)
  matchSidebarPermissions: (user, record, context) => {
    // Requires department & designation in JWT/User object
    if (!user) return false;

    // Logic: (AllowedDept has user.dept OR is Empty) AND (AllowedDesig has user.desig OR is Empty)
    return {
      $and: [
        {
          $or: [
            { allowedDepartments: { $in: [user.department] } },
            { allowedDepartments: { $size: 0 } },
            { allowedDepartments: { $exists: false } }
          ]
        },
        {
          $or: [
            { allowedDesignations: { $in: [user.designation] } },
            { allowedDesignations: { $size: 0 } },
            { allowedDesignations: { $exists: false } }
          ]
        }
      ]
    };
  }
};

export const getRegistry = (name) => {
  return registry[name];
};

export const listRegistries = () => {
  return Object.keys(registry);
};

export default {
  getRegistry,
  listRegistries,
  ...registry
};
