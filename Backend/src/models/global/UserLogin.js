import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserLoginSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    dbName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    role: {
      type: String,
      default: 'Employee',
    },
    userType: {
      type: String,
      enum: ['employee', 'agent', 'superadmin', 'global_admin'],
      default: 'employee',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended'],
      default: 'Active',
    },
    googleEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    googleLoginEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

UserLoginSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default UserLoginSchema;
