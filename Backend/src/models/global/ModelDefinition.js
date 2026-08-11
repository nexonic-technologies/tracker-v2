import mongoose from 'mongoose';

const FieldDefinitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['String', 'Number', 'Date', 'Boolean', 'ObjectId', 'Array', 'Object', 'Mixed'],
      default: 'String',
    },
    required: {
      type: Boolean,
      default: false,
    },
    unique: {
      type: Boolean,
      default: false,
    },
    indexed: {
      type: Boolean,
      default: false,
    },
    ref: {
      type: String, // Target model name e.g. "Employee"
      trim: true,
      default: null,
    },
    default: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    enum: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { _id: false }
);

const ModelDefinitionSchema = new mongoose.Schema(
  {
    modelName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    collectionName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    moduleId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: [FieldDefinitionSchema],
    timestamps: {
      type: Boolean,
      default: true,
    },
    isCustom: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Draft', 'Deprecated'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export default ModelDefinitionSchema;
