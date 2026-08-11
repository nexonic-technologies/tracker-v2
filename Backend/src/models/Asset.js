// models/Asset.js
import { Schema, model } from 'mongoose';

/**
 * Asset — The complete asset register. One document per physical unit.
 *
 * TWO independent classification fields:
 *   status    — Where the asset is in its lifecycle (operational state)
 *   condition — Physical quality of the asset (independent of where it is)
 *
 * Why separate?
 *   A laptop can be: status=Available, condition=Poor  (returned, usable but worn)
 *   A laptop can be: status=Allocated, condition=Excellent  (in use, like new)
 *   status and condition change independently. condition is updated on:
 *     - Initial entry (new asset = Excellent or Good)
 *     - Return from allocation (inspector verifies and records condition)
 *     - After repair completion (Phase 3)
 */
const AssetSchema = new Schema({

  // ── Identity ────────────────────────────────────────────────────────────────

  assetId: {
    type: String,
    unique: true
  },

  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'assets_categories',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true
    // Human-readable label. Example: "Dell Latitude 7420", "iPhone 14 Pro - Black"
  },

  serialNumber: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
    // sparse=true: multiple nulls allowed (many asset types have no serial numbers)
  },

  imei: {
    type: String,
    trim: true,
    sparse: true
    // Mobile-specific. Leave null for non-mobile assets.
  },

  make: {
    type: String,
    trim: true
    // Manufacturer: "Dell", "Apple", "HP", "Samsung", "Epson"
  },

  model: {
    type: String,
    trim: true
    // Model number / product name: "Latitude 7420", "LaserJet Pro MFP M428"
  },

  // ── Purchase / Procurement Info ──────────────────────────────────────────────

  purchaseId: {
    type: Schema.Types.ObjectId,
    ref: 'assets_purchases',
    default: null,
    index: true
  },

  purchaseDate: {
    type: Date
  },

  purchaseCost: {
    type: Number,
    min: 0
    // In organisation's base currency. Finance Phase 4 will aggregate this.
  },

  vendorName: {
    type: String,
    trim: true
  },

  invoiceNumber: {
    type: String,
    trim: true
  },

  invoiceFile: {
    type: String,
    default: null
    // Multer-uploaded file path. Uploaded via multipart/form-data.
  },

  warrantyExpiry: {
    type: Date
    // Index in AssetSchema.index() below — Phase 4 cron alert (30-day pre-expiry).
  },

  // ── Physical Location ────────────────────────────────────────────────────────

  storageLocation: {
    type: String,
    trim: true
    // Free-text location: "IT Store - Room 101", "Head Office Reception", "Warehouse B"
  },

  // ── Lifecycle Status ─────────────────────────────────────────────────────────

  status: {
    type: String,
    enum: ['Available', 'Allocated', 'Under Repair', 'Reserved', 'Lost', 'Disposed'],
    default: 'Available',
    index: true
    // Operational lifecycle state. Transitions enforced by beforeUpdate service hook.
    // Status is set by service hooks in Phase 2 (allocation) — not directly by employee.
  },

  metaStatus: {
    type: String,
    enum: ['active', 'inactive', 'archive'],
    default: 'active',
    index: true
    // Record lifecycle, not asset lifecycle.
    // 'archive' = Disposed assets kept for historical record.
  },

  // ── Physical Condition ───────────────────────────────────────────────────────
  //
  // SEPARATE from status. Answers: "What is the physical quality of this asset?"
  //
  // Updated at:
  //   → Initial entry (usually 'Excellent' or 'Good' for new assets)
  //   → Return from allocation (inspector records actual condition)
  //   → After repair (Phase 3 hook updates this when repair closes)
  //
  // Examples:
  //   Laptop returned after 2 years:       condition = 'Fair'
  //   Laptop damaged and repaired:         condition = 'Poor'
  //   Brand new laptop entered in system:  condition = 'Excellent'
  //   Laptop after screen crack:           condition = 'Damaged'

  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
    default: 'Good',
    index: true
  },

  // Last time condition was assessed and by whom
  conditionLastAssessedAt: {
    type: Date,
    default: null
  },

  conditionLastAssessedBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    default: null
  },

  conditionNotes: {
    type: String,
    trim: true,
    default: null
    // Free text: "Minor scratches on lid", "Keyboard key sticking", "Battery health 65%"
  },

  // ── Current Assignment (Denormalized) ────────────────────────────────────────
  //
  // Set by Phase 2 AssetAllocation service hook when allocation is approved.
  // Reset to null when asset is returned.
  // Denormalized here for fast dashboard lookups (no join required to find current holder).

  currentAllocatedTo: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    default: null
  },

  currentAllocationId: {
    type: Schema.Types.ObjectId,
    ref: 'assets_allocations',
    default: null
    // Placeholder field. Ref collection 'assets_allocations' does not exist in Phase 1.
    // MongoDB is schema-flexible — this ref is safe to declare even if the collection
    // doesn't exist yet. Populate will simply return null until Phase 2.
  },

  // ── General ──────────────────────────────────────────────────────────────────

  notes: {
    type: String,
    trim: true
    // Admin/IT remarks. Not employee-visible.
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'employees',
    required: true
  }

}, { timestamps: true });


AssetSchema.index({ categoryId: 1, status: 1 });            // category filter + status
AssetSchema.index({ status: 1, metaStatus: 1 });            // lifecycle queries
AssetSchema.index({ status: 1, createdAt: -1 });            // sorted list by status
AssetSchema.index({ condition: 1, status: 1 });             // condition + status cross-filter
AssetSchema.index({ currentAllocatedTo: 1 });               // fast "which assets does emp X have"
AssetSchema.index({ warrantyExpiry: 1 });                   // Phase 4 cron alert
AssetSchema.index({ purchaseDate: 1 });                     // Phase 4 finance reports
AssetSchema.index({ metaStatus: 1, status: 1, categoryId: 1 }); // dashboard aggregation

export default model('assets', AssetSchema);
