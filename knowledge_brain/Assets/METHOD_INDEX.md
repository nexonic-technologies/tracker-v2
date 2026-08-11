# Method & Model Index: Assets

## Models (Alphabetical)
| Model | Mongoose Name | Source File |
|---|---|---|
| **Asset** | `assets` | `Asset.js` |
| **AssetAllocation** | `assets_allocations` | `AssetAllocation.js` |
| **AssetCategory** | `assets_categories` | `AssetCategory.js` |
| **AssetIncident** | `assets_incidents` | `AssetIncident.js` |
| **AssetInvoice** | `assets_invoices` | `AssetInvoice.js` |
| **AssetPayment** | `assets_payments` | `AssetPayment.js` |
| **AssetPurchase** | `assets_purchases` | `AssetPurchase.js` |
| **AssetRepair** | `assets_repairs` | `AssetRepair.js` |
| **AssetStockLedger** | `assets_stock_ledgers` | `AssetStockLedger.js` |
| **AssetVendor** | `assets_vendors` | `AssetVendor.js` |

## Service Hooks & Helper Functions
| Function Name | File | Description |
|---|---|---|
| **beforeCreate** | `services/assets_allocations.js` | Allocation validation guard |
| **afterCreate** | `services/assets_allocations.js` | Approval workflow initiation |
| **beforeUpdate** | `services/assets_allocations.js` | State transition gate |
| **afterUpdate** | `services/assets_allocations.js` | Asset ownership update & stock log |
| **beforeCreate** | `services/assets_repairs.js` | Flags asset as Under Repair |
| **afterUpdate** | `services/assets_repairs.js` | Restores asset to Available or Disposed |
| **beforeCreate** | `services/assets_incidents.js` | Damage incident registrar |
| **afterCreate** | `services/assets_incidents.js` | Incident approval router |
| **writeLedgerEntry** | `services/assetHooksService.js` | Write stock entry helper |
| **handleGRNReceipt** | `services/assetHooksService.js` | Post-receipt asset generator |
