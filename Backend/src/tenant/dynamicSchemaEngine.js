import mongoose from 'mongoose';

/**
 * Maps field definition type string to Mongoose SchemaType.
 * @param {Object} fieldDef
 * @returns {Object|Function} Mongoose field configuration object
 */
function mapFieldType(fieldDef) {
  let type;
  switch (fieldDef.type) {
    case 'Number':
      type = Number;
      break;
    case 'Date':
      type = Date;
      break;
    case 'Boolean':
      type = Boolean;
      break;
    case 'ObjectId':
      type = mongoose.Schema.Types.ObjectId;
      break;
    case 'Array':
      if (fieldDef.ref) {
        type = [{ type: mongoose.Schema.Types.ObjectId, ref: fieldDef.ref }];
      } else {
        type = [String];
      }
      break;
    case 'Object':
      type = Object;
      break;
    case 'Mixed':
      type = mongoose.Schema.Types.Mixed;
      break;
    case 'String':
    default:
      type = String;
      break;
  }

  // If array type with ref was handled above, return direct type
  if (fieldDef.type === 'Array' && fieldDef.ref) {
    return type;
  }

  const fieldConfig = { type };

  if (fieldDef.required) fieldConfig.required = true;
  if (fieldDef.unique) fieldConfig.unique = true;
  if (fieldDef.indexed) fieldConfig.index = true;
  if (fieldDef.ref && fieldDef.type === 'ObjectId') fieldConfig.ref = fieldDef.ref;
  if (fieldDef.default !== null && fieldDef.default !== undefined) fieldConfig.default = fieldDef.default;
  if (Array.isArray(fieldDef.enum) && fieldDef.enum.length > 0) fieldConfig.enum = fieldDef.enum;

  return fieldConfig;
}

/**
 * Build a live Mongoose Schema object from a ModelDefinition JSON metadata object.
 * @param {Object} modelDef - ModelDefinition object from Global DB
 * @returns {mongoose.Schema}
 */
export function buildSchemaFromDefinition(modelDef) {
  if (!modelDef || !Array.isArray(modelDef.fields)) {
    throw new Error(`Invalid ModelDefinition: ${modelDef?.modelName || 'Unknown'}`);
  }

  const schemaFields = {};
  for (const field of modelDef.fields) {
    schemaFields[field.name] = mapFieldType(field);
  }

  const schema = new mongoose.Schema(schemaFields, {
    timestamps: modelDef.timestamps !== false,
  });

  return schema;
}
