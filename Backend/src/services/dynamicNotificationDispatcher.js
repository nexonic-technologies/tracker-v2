import { getRules } from '../utils/ruleCache.js';
import { getModel } from '../utils/appRegistry.js';
import models from '../models/Collection.js';
import NotificationDispatcher from './NotificationDispatcher.js';


// Custom resolvers registry for complex receiver extraction
const CUSTOM_RESOLVERS = {
  'feed_posts.groupMembers': async (doc) => {
    if (!doc.group) return [];
    try {
      const group = await models.feed_groups.findById(doc.group).select('members.employee').lean();
      return group?.members?.map(m => m.employee.toString()) || [];
    } catch (err) {
      console.error('[CustomResolver] feed_posts.groupMembers failed:', err.message);
      return [];
    }
  },
  'feed_posts.channelMembers': async (doc) => {
    if (!doc.channel) return [];
    try {
      const channel = await models.feed_channels.findById(doc.channel).select('members.employee groups').lean();
      const receivers = channel?.members?.map(m => m.employee.toString()) || [];
      if (channel?.groups?.length > 0) {
        const groups = await models.feed_groups.find({ _id: { $in: channel.groups } }).select('members.employee').lean();
        groups.forEach(g => {
          if (g.members) receivers.push(...g.members.map(m => m.employee.toString()));
        });
      }
      return [...new Set(receivers)];
    } catch (err) {
      console.error('[CustomResolver] feed_posts.channelMembers failed:', err.message);
      return [];
    }
  },
  'tasks.threadParticipants': async (doc) => {
    if (!doc.taskId) return [];
    try {
      const Task = getModel('tasks');
      const task = await Task.findById(doc.taskId).select('assignedTo createdBy followers').lean();
      if (!task) return [];
      const list = new Set();
      task.assignedTo?.forEach(id => id && list.add(id.toString()));
      if (task.createdBy) list.add(task.createdBy.toString());
      task.followers?.forEach(id => id && list.add(id.toString()));
      return [...list];
    } catch (err) {
      console.error('[CustomResolver] tasks.threadParticipants failed:', err.message);
      return [];
    }
  }
};

// Safe deep path value retriever
function getPathValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Reconstruct previous value based on beforeSnapshot
function getOldValue(field, doc, beforeSnapshot) {
  if (beforeSnapshot && Object.prototype.hasOwnProperty.call(beforeSnapshot, field)) {
    return beforeSnapshot[field];
  }
  return getPathValue(doc, field);
}

// Evaluates a single condition on the document
function evaluateCondition(cond, doc, beforeSnapshot, trigger) {
  const { field, operator, value } = cond;
  const newValue = getPathValue(doc, field);

  switch (operator) {
    case 'equals':
      return newValue?.toString() === value?.toString();
    case 'not_equals':
      return newValue?.toString() !== value?.toString();
    case 'changed':
      if (trigger !== 'update') return false;
      const oldValue = getOldValue(field, doc, beforeSnapshot);
      return oldValue?.toString() !== newValue?.toString();
    case 'exists':
      return newValue !== undefined && newValue !== null;
    case 'contains':
      return Array.isArray(newValue) && newValue.map(x => x?.toString()).includes(value?.toString());
    case 'in':
      return Array.isArray(value) && value.map(x => x?.toString()).includes(newValue?.toString());
    case 'gt':
      return Number(newValue) > Number(value);
    case 'gte':
      return Number(newValue) >= Number(value);
    case 'lt':
      return Number(newValue) < Number(value);
    case 'lte':
      return Number(newValue) <= Number(value);
    case 'regex':
      return new RegExp(value, 'i').test(newValue?.toString());
    default:
      return false;
  }
}

// Evaluates AND/OR condition groups
function evaluateGroup(conditionGroups, doc, beforeSnapshot, trigger) {
  if (!conditionGroups || !conditionGroups.conditions || conditionGroups.conditions.length === 0) {
    return true; // Empty conditions match always
  }

  const { operator, conditions } = conditionGroups;
  if (operator === 'OR') {
    return conditions.some(cond => evaluateCondition(cond, doc, beforeSnapshot, trigger));
  } else {
    // Default to AND
    return conditions.every(cond => evaluateCondition(cond, doc, beforeSnapshot, trigger));
  }
}

// Safe recursive filter interpolator for recipient queries
function interpolateFilterValue(val, context) {
  if (typeof val === 'string') {
    // If exact single key placeholder, return the resolved type/ID directly (safely preserving ObjectIds)
    const match = val.match(/^\{\{([^}]+)\}\}$/);
    if (match) {
      return getPathValue(context, match[1].trim());
    }
    // Perform general string replacements
    return val.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const resolvedVal = getPathValue(context, path.trim());
      return resolvedVal !== undefined && resolvedVal !== null ? resolvedVal.toString() : '';
    });
  } else if (val && typeof val === 'object' && !Array.isArray(val)) {
    const obj = {};
    for (const key in val) {
      obj[key] = interpolateFilterValue(val[key], context);
    }
    return obj;
  }
  return val;
}

// Safely interpolate templates
function interpolateTemplate(template, context) {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const resolvedVal = getPathValue(context, path.trim());
    return resolvedVal !== undefined && resolvedVal !== null ? resolvedVal.toString() : '';
  });
}

class DynamicNotificationDispatcher {
  /**
   * Main entry point called by the event worker.
   * Matches active rules, resolves recipients, renders templates, and dispatches.
   */
  async evaluate({ eventType, modelName, modelId, doc, beforeSnapshot, actorId, actorDetails, timestamp }) {
    // 1. Fetch matching rule configurations
    const rules = await getRules(modelName, eventType);
    if (rules.length === 0) return;

    // 2. Build templates rendering context
    // Reconstruct a virtual "old" doc using the beforeSnapshot diff over the current state
    const oldDoc = { ...doc };
    if (beforeSnapshot) {
      for (const [key, val] of Object.entries(beforeSnapshot)) {
        oldDoc[key] = val;
      }
    }

    const context = {
      document: doc,
      new: doc,
      old: oldDoc,
      actor: actorDetails || { basicInfo: { firstName: 'System', lastName: '' } },
      date: new Date(timestamp).toLocaleString()
    };

    // 3. Process rules in priority order
    for (const rule of rules) {
      try {
        // Validate conditions matching
        const isMatched = evaluateGroup(rule.conditionGroups, doc, beforeSnapshot, eventType);
        if (!isMatched) continue;

        // Resolve recipients list
        const recipientsSet = new Set();

        // A. Resolve fields paths on the document
        if (rule.recipients?.fields) {
          for (const field of rule.recipients.fields) {
            const fieldValue = getPathValue(doc, field);
            if (Array.isArray(fieldValue)) {
              fieldValue.forEach(id => id && recipientsSet.add(id.toString()));
            } else if (fieldValue) {
              recipientsSet.add(fieldValue.toString());
            }
          }
        }

        // B. Resolve role names (fetch matching employee IDs)
        if (rule.recipients?.roles && rule.recipients.roles.length > 0) {
          const matchedRoles = await models.roles.find({
            name: { $in: rule.recipients.roles },
            isActive: true
          }).select('_id').lean();

          if (matchedRoles.length > 0) {
            const roleIds = matchedRoles.map(r => r._id);
            const matchedEmployees = await models.employees.find({
              'professionalInfo.role': { $in: roleIds },
              status: 'Active'
            }).select('_id').lean();

            matchedEmployees.forEach(emp => recipientsSet.add(emp._id.toString()));
          }
        }

        // C. Resolve custom resolvers
        if (rule.recipients?.customResolvers) {
          for (const resolverKey of rule.recipients.customResolvers) {
            const resolver = CUSTOM_RESOLVERS[resolverKey];
            if (resolver) {
              const ids = await resolver(doc);
              ids.forEach(id => id && recipientsSet.add(id.toString()));
            }
          }
        }

        // D. Resolve safe structured Mongo queries
        if (rule.recipients?.queries) {
          for (const q of rule.recipients.queries) {
            const TargetModel = getModel(q.model || 'employees');
            if (TargetModel) {
              const compiledFilter = interpolateFilterValue(q.filter, context);
              const matchedDocs = await TargetModel.find(compiledFilter).select('_id').lean();
              matchedDocs.forEach(d => recipientsSet.add(d._id.toString()));
            }
          }
        }

        // Filter out self-notifications (actor triggering the action shouldn't receive it)
        if (actorId) {
          recipientsSet.delete(actorId.toString());
        }

        const recipients = [...recipientsSet];
        if (recipients.length === 0) continue;

        // 4. Render template details
        const title = interpolateTemplate(rule.template.title, context);
        const message = interpolateTemplate(rule.template.message, context);
        const path = interpolateTemplate(rule.template.path, context);

        // 5. Send notifications via the centralized NotificationDispatcher
        await NotificationDispatcher.dispatch({
          recipients,
          sender: actorId,
          title,
          message,
          type: rule.template.type || 'system',
          meta: {
            model: modelName,
            modelId: modelId,
            icon: rule.template.icon,
            priority: rule.template.priority,
            category: rule.template.category
          },
          path
        });

        // If stopProcessing is set to true, break the rules loop
        if (rule.stopProcessing) {
          // console.log(`[RulesEngine] Match rule "${rule.name}" triggered stopProcessing.`);
          break;
        }

      } catch (err) {
        console.error(`[RulesEngine] Error evaluating rule "${rule.name}":`, err.message);
      }
    }
  }
}

export default new DynamicNotificationDispatcher();
