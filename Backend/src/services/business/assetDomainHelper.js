import models from '../../models/Collection.js';


/**
 * Write an entry to the Asset Stock Ledger
 */
export async function writeLedgerEntry({
  assetId,
  transactionType,
  triggerType,
  previousState,
  newState,
  quantity = 1,
  performedBy,
  referenceModel,
  referenceId
}) {
  try {
    // Normalise previousState/newState to match the stock ledger schema enum if needed
    const VALID_PREV_STATES = ["Ordered", "Available", "Allocated", "Under Repair", "Disposed"];
    const VALID_NEW_STATES = ["Available", "Allocated", "Under Repair", "Disposed"];

    const cleanPrev = VALID_PREV_STATES.includes(previousState) ? previousState : undefined;
    const cleanNew = VALID_NEW_STATES.includes(newState) ? newState : undefined;

    // Resolve performedBy if not provided
    let actorId = performedBy;
    if (!actorId) {
      const defaultEmp = await models.employees.findOne({ status: "Active" }).select("_id").lean();
      actorId = defaultEmp?._id;
    }

    const ledgerDoc = new models.assets_stock_ledgers({
      assetId,
      transactionType,
      triggerType,
      previousState: cleanPrev,
      newState: cleanNew,
      quantity,
      performedBy: actorId,
      referenceModel,
      referenceId,
      transactionDate: new Date()
    });

    await ledgerDoc.save();
    console.log(`[AssetStockLedger] Logged ${transactionType} - ${triggerType} for Asset: ${assetId}`);
    return ledgerDoc;
  } catch (err) {
    console.error(`[AssetStockLedger] Failed to write ledger entry:`, err);
    // Don't crash the main process if ledger logging fails, but log it clearly
  }
}

/**
 * Handle Goods Receipt Note (GRN) Approval Receipt
 * Triggered when AssetPurchase.status transitions to 'Received'
 */
export async function handleGRNReceipt(purchase, userId) {
  try {
    // 1. Uniqueness check: make sure we don't recreate assets for this purchase
    const existingCount = await models.assets.countDocuments({ purchaseId: purchase._id });
    if (existingCount > 0) {
      console.warn(`[GRN Receipt] Assets already generated for Purchase ID: ${purchase._id}. Skipping.`);
      return;
    }

    // 2. Fetch vendor details
    const vendor = await models.assets_vendors.findById(purchase.vendorId).lean();
    const vendorName = vendor ? vendor.name : "Unknown Vendor";

    // 3. Resolve creator employee ID
    let creatorId = userId;
    if (!creatorId) {
      const defaultEmp = await models.employees.findOne({ status: "Active" }).select("_id").lean();
      creatorId = defaultEmp?._id;
    }

    if (!creatorId) {
      throw new Error("No active employee found to set as creator for assets.");
    }

    // Fetch start asset count for assetId sequence generation
    const baseCount = await models.assets.countDocuments();
    let currentCount = baseCount;

    // Loop through each item in the purchase order
    for (const item of purchase.items) {
      const qty = item.quantity;
      console.log(`[GRN Receipt] Generating ${qty} assets for category ${item.categoryId}`);

      for (let i = 0; i < qty; i++) {
        currentCount++;
        const assetId = `AST-${String(currentCount).padStart(6, '0')}`;

        // Formulate a unique serial number if a prefix is provided
        const serialNumber = item.serialNumberPrefix
          ? `${item.serialNumberPrefix}${assetId}`
          : undefined;

        const assetData = {
          assetId,
          categoryId: item.categoryId,
          name: item.name,
          make: vendorName,
          model: item.model,
          purchaseId: purchase._id,
          purchaseDate: purchase.purchaseDate || new Date(),
          purchaseCost: item.unitPrice,
          vendorName: vendorName,
          invoiceNumber: purchase.poNumber,
          status: "Available",
          condition: "Excellent",
          createdBy: creatorId
        };

        if (serialNumber) {
          assetData.serialNumber = serialNumber;
        }

        const newAsset = new models.assets(assetData);
        const savedAsset = await newAsset.save();

        // 4. Write IN transaction to stock ledger
        await writeLedgerEntry({
          assetId: savedAsset._id,
          transactionType: "IN",
          triggerType: "Purchase_Receipt",
          previousState: "Ordered",
          newState: "Available",
          quantity: 1,
          performedBy: creatorId,
          referenceModel: "assets_purchases",
          referenceId: purchase._id
        });
      }
    }

    console.log(`[GRN Receipt] Successfully processed receipt for PO ${purchase.poNumber}`);
  } catch (err) {
    console.error(`[GRN Receipt] Error processing GRN receipt for PO:`, err);
    throw err;
  }
}
