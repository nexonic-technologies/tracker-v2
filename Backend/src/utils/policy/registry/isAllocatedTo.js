/**
 * Registry: isAllocatedTo
 * Checks if the current user is allocated to the asset or assetallocation.
 */
export default function isAllocatedTo(user, record, context = {}) {
  if (!user) return false;

  const modelName = context.modelName;

  // Single record validation (evaluating loaded documents)
  if (record && Object.keys(record).length > 0) {
    if (modelName === 'assets') {
      return record.currentAllocatedTo && record.currentAllocatedTo.toString() === user.id.toString();
    }
    if (modelName === 'assets_allocations' || modelName === 'assets_incidents') {
      return record.employeeId && record.employeeId.toString() === user.id.toString();
    }
    return false;
  }

  // Filter query generation for lists (scoping Mongo queries)
  if (modelName === 'assets') {
    return {
      filter: { currentAllocatedTo: user.id }
    };
  }
  if (modelName === 'assets_allocations' || modelName === 'assets_incidents') {
    return {
      filter: { employeeId: user.id }
    };
  }

  return false;
}
