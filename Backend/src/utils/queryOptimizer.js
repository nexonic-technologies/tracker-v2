// Query optimization utility for improved database performance
class QueryOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Optimized pagination with aggregation support
  async paginatedQuery(Model, options = {}) {
    const {
      filter = {},
      fields = null,
      populateFields = null,
      sort = { createdAt: -1 },
      page = 1,
      limit = 10,
      useAggregation = false
    } = options;

    try {
      const skip = (page - 1) * limit;

      if (useAggregation && populateFields && populateFields.length > 0) {
        // Use aggregation pipeline for complex queries with population
        return await this.aggregatedPaginatedQuery(Model, {
          filter,
          fields,
          populateFields,
          sort,
          skip,
          limit
        });
      } else {
        // Use regular query for simple cases
        return await this.regularPaginatedQuery(Model, {
          filter,
          fields,
          sort,
          skip,
          limit,
          populateFields
        });
      }
    } catch (error) {
      console.error('QueryOptimizer paginatedQuery error:', error);
      throw error;
    }
  }

  // Regular pagination query
  async regularPaginatedQuery(Model, options) {
    const { filter, fields, sort, skip, limit, populateFields } = options;

    // Build the query
    let query = Model.find(filter);

    // Apply field selection
    if (fields) {
      query = query.select(fields);
    }

    // Apply population
    if (populateFields && Array.isArray(populateFields)) {
      populateFields.forEach(populate => {
        query = query.populate(populate);
      });
    }

    // Apply sorting, pagination
    query = query.sort(sort).skip(skip).limit(limit);

    // Execute query and count in parallel
    const [data, totalItems] = await Promise.all([
      query.lean().exec(),
      Model.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(skip / limit) + 1;

    return {
      data,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  }

  // Aggregated pagination query for complex population
  async aggregatedPaginatedQuery(Model, options) {
    const { filter, fields, populateFields, sort, skip, limit } = options;

    const pipeline = [];

    // Match stage
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Lookup stages for population
    if (populateFields && Array.isArray(populateFields)) {
      populateFields.forEach(populate => {
        if (populate.path) {
          pipeline.push({
            $lookup: {
              from: this.getCollectionName(populate.path),
              localField: populate.path,
              foreignField: '_id',
              as: populate.path
            }
          });

          // Unwind if it's not an array field
          if (!populate.isArray) {
            pipeline.push({
              $unwind: {
                path: `$${populate.path}`,
                preserveNullAndEmptyArrays: true
              }
            });
          }

          // Select specific fields from populated document
          if (populate.select) {
            const selectFields = populate.select.split(' ');
            const projection = {};
            selectFields.forEach(field => {
              projection[`${populate.path}.${field}`] = 1;
            });
            pipeline.push({ $addFields: projection });
          }
        }
      });
    }

    // Project stage for field selection
    if (fields) {
      const projection = {};
      if (typeof fields === 'string') {
        fields.split(' ').forEach(field => {
          if (field.startsWith('-')) {
            projection[field.substring(1)] = 0;
          } else {
            projection[field] = 1;
          }
        });
      }
      // Only add project stage if projection has fields
      if (Object.keys(projection).length > 0) {
        pipeline.push({ $project: projection });
      }
    }

    // Sort stage
    if (sort) {
      pipeline.push({ $sort: sort });
    }

    // Facet stage for pagination and count
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        count: [
          { $count: 'total' }
        ]
      }
    });

    const [result] = await Model.aggregate(pipeline);
    const data = result.data || [];
    const totalItems = result.count[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.floor(skip / limit) + 1;

    return {
      data,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  }

  // Dynamic collection name resolver using Model schema instead of hardcoded maps
  getCollectionName(Model, fieldPath) {
    if (!Model?.schema) return fieldPath + 's';
    const schemaPath = Model.schema.path(fieldPath)
      || Model.schema.path(`${fieldPath}.$`)
      || Model.schema.virtualpath?.(fieldPath);
    if (schemaPath?.options?.ref) {
      return schemaPath.options.ref;
    }
    if (schemaPath?.caster?.options?.ref) {
      return schemaPath.caster.options.ref;
    }
    return fieldPath + 's';
  }

  // Cache management strictly scoped by tenant
  getCacheKey(tenantId, model, filter, options) {
    const safeTenant = tenantId || 'global';
    return `${safeTenant}:${model}_${JSON.stringify(filter)}_${JSON.stringify(options)}`;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(pattern = null, tenantId = null) {
    const prefix = tenantId ? `${tenantId}:` : '';
    const fullPattern = pattern ? `${prefix}${pattern}` : prefix;

    if (fullPattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(fullPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Performance monitoring
  async executeWithTiming(operation, operationName) {
    const startTime = Date.now();
    try {
      const result = await operation();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 1000) {
        console.warn(`Slow query detected: ${operationName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`Query failed: ${operationName} failed after ${duration}ms`, error);
      throw error;
    }
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

export default queryOptimizer;