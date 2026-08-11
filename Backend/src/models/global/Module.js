import mongoose from 'mongoose';

const ModuleSchema = new mongoose.Schema(
  {
    moduleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      default: 'Layers',
    },
    isCore: {
      type: Boolean,
      default: false,
    },
    modelDefinitions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ModelDefinition',
      },
    ],
    collections: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Active', 'Deprecated'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export default ModuleSchema;
