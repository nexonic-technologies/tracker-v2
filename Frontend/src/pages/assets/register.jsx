import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import toast from "react-hot-toast";
import SearchableDropdown from "@components/Common/SearchableDropdown";
import { ArrowDownCircle, ArrowUpCircle, X, BarChart2 } from "lucide-react";


const Register = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");

  // Add Asset Modal Form State
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [conditionVal, setConditionVal] = useState("Good");
  const [notes, setNotes] = useState("");
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // Allocate Drawer Form State
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [allocationType, setAllocationType] = useState("Allocation");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [allocationNotes, setAllocationNotes] = useState("");
  const [submittingAlloc, setSubmittingAlloc] = useState(false);

  // Report Incident Form State
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentType, setIncidentType] = useState("Damage");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [estRepairCost, setEstRepairCost] = useState("");
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Send to Repair Form State
  const [repairOpen, setRepairOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [repairDesc, setRepairDesc] = useState("");
  const [expectedRepairReturn, setExpectedRepairReturn] = useState("");
  const [estimatedRepairCost, setEstimatedRepairCost] = useState("");
  const [submittingRepair, setSubmittingRepair] = useState(false);

  // Stock Ledger Drawer State
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerAsset, setLedgerAsset] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch Assets
      const assetsRes = await axiosInstance.post("/populate/read/assets", {
        limit: 1000,
        populateFields: {
          categoryId: "name,code",
          currentAllocatedTo: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      setAssets(assetsRes.data?.data || []);

      // Fetch Categories
      const catsRes = await axiosInstance.post("/populate/read/assets_categories", {
        filter: { isActive: true },
        limit: 1000
      });
      setCategories(catsRes.data?.data || []);

      // Fetch Active Employees
      const empsRes = await axiosInstance.post("/populate/read/employees", {
        filter: { status: "Active", isActive: true },
        limit: 1000
      });
      setEmployees(empsRes.data?.data || []);

    } catch (error) {
      console.error("Error loading register data:", error);
      toast.error("Failed to load assets data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetLedger = async (asset) => {
    setLedgerAsset(asset);
    setLedgerEntries([]);
    setLedgerOpen(true);
    setLoadingLedger(true);
    try {
      const res = await axiosInstance.post("/populate/read/asset_stock_ledgers", {
        filter: { assetId: asset._id },
        sort: { transactionDate: -1 },
        limit: 200,
        populateFields: { performedBy: "basicInfo.firstName,basicInfo.lastName" },
      });
      setLedgerEntries(res.data?.data || []);
    } catch {
      toast.error("Failed to load stock movements.");
    } finally {
      setLoadingLedger(false);
    }
  };


  const handleOpenAddAsset = () => {
    setName("");
    setCatId(categories[0]?._id || "");
    setSerialNumber("");
    setMake("");
    setModel("");
    setStorageLocation("");
    setPurchaseCost("");
    setPurchaseDate("");
    setWarrantyExpiry("");
    setConditionVal("Good");
    setNotes("");
    setAddAssetOpen(true);
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!name || !catId) {
      toast.error("Name and Category are required");
      return;
    }

    setSubmittingAsset(true);
    const payload = {
      name,
      categoryId: catId,
      serialNumber: serialNumber.trim() || undefined,
      make,
      model,
      storageLocation,
      purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
      purchaseDate: purchaseDate || undefined,
      warrantyExpiry: warrantyExpiry || undefined,
      condition: conditionVal,
      notes
    };

    try {
      await axiosInstance.post("/populate/create/assets", payload);
      toast.success("Asset added to register successfully");
      fetchInitialData();
      setAddAssetOpen(false);
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(error.response?.data?.message || "Failed to add asset");
    } finally {
      setSubmittingAsset(false);
    }
  };

  const handleOpenAllocate = (asset) => {
    setSelectedAsset(asset);
    setTargetEmployeeId(employees[0]?._id || "");
    setAllocationType("Allocation");
    setExpectedReturn("");
    setAllocationNotes("");
    setAllocateOpen(true);
  };

  const handleAllocateAsset = async (e) => {
    e.preventDefault();
    if (!targetEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    setSubmittingAlloc(true);
    try {
      await axiosInstance.post("/populate/create/assets_allocations", {
        assetId: selectedAsset._id,
        employeeId: targetEmployeeId,
        allocationType,
        expectedReturn: expectedReturn || undefined,
        notes: allocationNotes
      });
      toast.success("Allocation request created & queued for approval");
      fetchInitialData();
      setAllocateOpen(false);
    } catch (error) {
      console.error("Error allocating asset:", error);
      toast.error(error.response?.data?.message || "Failed to allocate asset");
    } finally {
      setSubmittingAlloc(false);
    }
  };

  const handleOpenIncident = (asset) => {
    setSelectedAsset(asset);
    setIncidentType("Damage");
    setIncidentDate(new Date().toISOString().split("T")[0]);
    setIncidentDesc("");
    setEstRepairCost("");
    setIncidentOpen(true);
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentDesc) {
      toast.error("Please describe the incident");
      return;
    }

    setSubmittingIncident(true);
    try {
      await axiosInstance.post("/populate/create/assets_incidents", {
        assetId: selectedAsset._id,
        incidentType,
        incidentDate,
        description: incidentDesc,
        estimatedRepairCost: estRepairCost ? Number(estRepairCost) : undefined
      });
      toast.success("Incident reported & frozen for validation");
      fetchInitialData();
      setIncidentOpen(false);
    } catch (error) {
      console.error("Error reporting incident:", error);
      toast.error(error.response?.data?.message || "Failed to report incident");
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleOpenRepair = (asset) => {
    setSelectedAsset(asset);
    setVendorName("");
    setVendorContact("");
    setRepairDesc("");
    setExpectedRepairReturn("");
    setEstimatedRepairCost("");
    setRepairOpen(true);
  };

  const handleSendToRepair = async (e) => {
    e.preventDefault();
    setSubmittingRepair(true);
    try {
      await axiosInstance.post("/populate/create/assets_repairs", {
        assetId: selectedAsset._id,
        vendorName,
        vendorContact,
        repairDescription: repairDesc,
        expectedReturnDate: expectedRepairReturn || undefined,
        repairCost: estimatedRepairCost ? Number(estimatedRepairCost) : undefined
      });
      toast.success("Asset sent to external repair");
      fetchInitialData();
      setRepairOpen(false);
    } catch (error) {
      console.error("Error sending to repair:", error);
      toast.error(error.response?.data?.message || "Failed to send to repair");
    } finally {
      setSubmittingRepair(false);
    }
  };

  // Filter computation
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || asset.categoryId?._id === selectedCategory;
    const matchesStatus = !selectedStatus || asset.status === selectedStatus;
    const matchesCondition = !selectedCondition || asset.condition === selectedCondition;

    return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Available": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Allocated": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "Reserved": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "Under Repair": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "Lost": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "Disposed": return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
      default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case "Excellent": return "text-emerald-500";
      case "Good": return "text-teal-500";
      case "Fair": return "text-amber-500";
      case "Poor": return "text-orange-500";
      case "Damaged": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Asset Register</h1>
          <p className="text-sm text-ink-muted mt-1">Manage physical hardware lifecycle, conditions, and assignments.</p>
        </div>
        <button
          onClick={handleOpenAddAsset}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg shadow-md transition-all duration-200"
        >
          Add Asset
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] p-4 rounded-xl shadow-sm">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Search Assets</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ID, Name, Serial..."
            className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Category</label>
          <SearchableDropdown
            placeholder="All Categories"
            value={selectedCategory}
            options={categories.map(c => ({ value: c._id, label: c.name }))}
            onChange={(val) => setSelectedCategory(val)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</label>
          <SearchableDropdown
            placeholder="All Statuses"
            value={selectedStatus}
            options={[
              { value: "", label: "All Statuses" },
              { value: "Available", label: "Available" },
              { value: "Allocated", label: "Allocated" },
              { value: "Reserved", label: "Reserved" },
              { value: "Under Repair", label: "Under Repair" },
              { value: "Lost", label: "Lost" },
              { value: "Disposed", label: "Disposed" }
            ]}
            onChange={(val) => setSelectedStatus(val)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Condition</label>
          <SearchableDropdown
            placeholder="All Conditions"
            value={selectedCondition}
            options={[
              { value: "", label: "All Conditions" },
              { value: "Excellent", label: "Excellent" },
              { value: "Good", label: "Good" },
              { value: "Fair", label: "Fair" },
              { value: "Poor", label: "Poor" },
              { value: "Damaged", label: "Damaged" }
            ]}
            onChange={(val) => setSelectedCondition(val)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No assets found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try tweaking your search filters or add a new asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset._id}
              className="bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                      {asset.categoryId?.name || "General"}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">{asset.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Asset ID:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{asset.assetId}</span>
                  </div>
                  {asset.serialNumber && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Serial No:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">{asset.serialNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Condition:</span>
                    <span className={`font-semibold ${getConditionColor(asset.condition)}`}>{asset.condition}</span>
                  </div>
                  {asset.status === "Allocated" && asset.currentAllocatedTo && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Assigned To:</span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {asset.currentAllocatedTo.basicInfo?.firstName} {asset.currentAllocatedTo.basicInfo?.lastName}
                      </span>
                    </div>
                  )}
                  {asset.storageLocation && (
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Storage Location:</span>
                      <span className="text-gray-850 dark:text-gray-250 truncate max-w-[150px]">{asset.storageLocation}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-5 py-3.5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-end gap-2">
                {asset.status === "Available" && (
                  <>
                    <button
                      onClick={() => handleOpenAllocate(asset)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-colors"
                    >
                      Allocate
                    </button>
                    <button
                      onClick={() => handleOpenRepair(asset)}
                      className="px-2.5 py-1.5 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] hover:border-orange-200 hover:text-orange-600 dark:hover:border-orange-800/30 text-[11px] font-bold rounded-md transition-colors"
                    >
                      Repair
                    </button>
                  </>
                )}
                {asset.status === "Allocated" && (
                  <button
                    onClick={() => handleOpenIncident(asset)}
                    className="px-2.5 py-1.5 bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] hover:border-red-200 hover:text-red-650 dark:hover:border-red-800/30 text-[11px] font-bold rounded-md transition-colors"
                  >
                    Report Damage
                  </button>
                )}
                {asset.status === "Under Repair" && (
                  <button
                    onClick={() => handleOpenRepair(asset)}
                    className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-colors"
                  >
                    Register Repair Log
                  </button>
                )}
                {/* Stock Movements button — always available */}
                <button
                  onClick={() => fetchAssetLedger(asset)}
                  className="px-2.5 py-1.5 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] hover:border-indigo-200 hover:text-indigo-600 dark:hover:border-indigo-800/30 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1"
                  title="View stock movement history"
                >
                  <BarChart2 size={11} />
                  History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Asset Modal */}
      {addAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Add Asset to Register</h3>
              <button onClick={() => setAddAssetOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Asset Name</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Macbook Pro 16"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <SearchableDropdown
                    placeholder="Select Category"
                    value={catId}
                    options={categories.map(c => ({ value: c._id, label: c.name }))}
                    onChange={(val) => setCatId(val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Make</label>
                  <input
                    type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Apple"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Model</label>
                  <input
                    type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="M2 Pro"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Serial Number</label>
                  <input
                    type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="C02XX..."
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Storage Location</label>
                  <input
                    type="text" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="IT Store - Room 1"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Condition</label>
                  <SearchableDropdown
                    value={conditionVal}
                    options={["Excellent", "Good", "Fair", "Poor", "Damaged"]}
                    onChange={(val) => setConditionVal(val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Purchase Cost</label>
                  <input
                    type="number" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} placeholder="120000"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Purchase Date</label>
                  <input
                    type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Warranty Expiry</label>
                  <input
                    type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Internal Notes</label>
                <textarea
                  rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="IT audit notes..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button" onClick={() => setAddAssetOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submittingAsset}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors"
                >
                  {submittingAsset ? "Adding..." : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Drawer */}
      {allocateOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-surface dark:bg-surface border-l border-gray-100 dark:border-white/[0.08] shadow-2xl flex flex-col justify-between animate-slide-in">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.01]">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Allocate Asset</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Assign {selectedAsset.name} to employee.</p>
              </div>
              <button onClick={() => setAllocateOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAllocateAsset} className="p-5 flex-1 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Select Employee</label>
                <SearchableDropdown
                  placeholder="Select Employee"
                  value={targetEmployeeId}
                  options={employees.map(emp => ({
                    value: emp._id,
                    label: `${emp.basicInfo?.firstName} ${emp.basicInfo?.lastName} (${emp.professionalInfo?.empId || "N/A"})`
                  }))}
                  onChange={(val) => setTargetEmployeeId(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Allocation Type</label>
                <SearchableDropdown
                  value={allocationType}
                  options={[
                    { value: "Allocation", label: "Standard Allocation" },
                    { value: "Temporary", label: "Temporary Assignment" }
                  ]}
                  onChange={(val) => setAllocationType(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Expected Return Date</label>
                <input
                  type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Allocation Notes</label>
                <textarea
                  rows={4} value={allocationNotes} onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Reason for allocation, custom agreements..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>
            </form>

            <div className="p-5 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.01] flex gap-3 justify-end">
              <button
                type="button" onClick={() => setAllocateOpen(false)}
                className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocateAsset} disabled={submittingAlloc}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors"
              >
                {submittingAlloc ? "Allocating..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {incidentOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Report Damage / Incident</h3>
              <button onClick={() => setIncidentOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Incident Type</label>
                  <SearchableDropdown
                    value={incidentType}
                    options={["Damage", "Theft", "Loss", "Negligence"]}
                    onChange={(val) => setIncidentType(val)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date of Incident</label>
                  <input
                    type="date" required value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Estimated Repair Cost</label>
                <input
                  type="number" value={estRepairCost} onChange={(e) => setEstRepairCost(e.target.value)} placeholder="5000"
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Incident Description & Details</label>
                <textarea
                  required rows={3} value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Describe how the asset was damaged, list specific broken parts, or conditions of theft..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button" onClick={() => setIncidentOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submittingIncident}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 disabled:bg-red-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors"
                >
                  {submittingIncident ? "Reporting..." : "Report Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repair Modal */}
      {repairOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Send Asset for Repair</h3>
              <button onClick={() => setRepairOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendToRepair} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Vendor Name</label>
                  <input
                    type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Dell Repair Service"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Vendor Contact</label>
                  <input
                    type="text" value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} placeholder="+91 99999..."
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Expected Return Date</label>
                  <input
                    type="date" value={expectedRepairReturn} onChange={(e) => setExpectedRepairReturn(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Repair Cost</label>
                  <input
                    type="number" value={estimatedRepairCost} onChange={(e) => setEstimatedRepairCost(e.target.value)} placeholder="8000"
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Repair Notes / Diagnosis</label>
                <textarea
                  rows={3} value={repairDesc} onChange={(e) => setRepairDesc(e.target.value)}
                  placeholder="Battery swelling replacement, cracked keyboard panel repair..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button" onClick={() => setRepairOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submittingRepair}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors"
                >
                  {submittingRepair ? "Registering..." : "Send for Repair"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Asset Stock Ledger Slide-Over ──────────────────────── */}
      {ledgerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setLedgerOpen(false)}
          />
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/[0.06] sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-3">
                <BarChart2 size={18} className="text-indigo-500" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Stock Movement History
                  </h3>
                  {ledgerAsset && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ledgerAsset.name} · {ledgerAsset.assetId}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setLedgerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 space-y-3">
              {loadingLedger ? (
                <div className="py-12 flex justify-center">
                  <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-gray-400">
                  <BarChart2 size={36} strokeWidth={1.2} />
                  <p className="text-sm">No stock movements recorded yet.</p>
                  <p className="text-xs text-center">Movements are recorded automatically when assets are allocated, repaired, or returned.</p>
                </div>
              ) : (
                ledgerEntries.map((entry) => {
                  const isIn = entry.transactionType === "IN";
                  const TRIGGER_LABELS = {
                    Purchase_Receipt:    "Purchase Receipt",
                    Employee_Return:     "Employee Return",
                    Repair_Return:       "Returned from Repair",
                    Employee_Allocation: "Allocated to Employee",
                    Send_To_Repair:      "Sent for Repair",
                    Write_Off_Disposal:  "Written Off / Disposed",
                  };
                  return (
                    <div
                      key={entry._id}
                      className={`rounded-xl border p-4 ${
                        isIn
                          ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20"
                          : "border-rose-200 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {isIn ? (
                            <ArrowUpCircle size={18} className="text-emerald-500 flex-shrink-0" />
                          ) : (
                            <ArrowDownCircle size={18} className="text-rose-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {TRIGGER_LABELS[entry.triggerType] || entry.triggerType}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(entry.transactionDate || entry.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric"
                              })}
                              {entry.performedBy?.basicInfo?.firstName && (
                                <> · by {entry.performedBy.basicInfo.firstName} {entry.performedBy.basicInfo.lastName || ""}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                          isIn
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}>
                          {isIn ? "IN" : "OUT"} ×{entry.quantity}
                        </span>
                      </div>

                      {(entry.previousState || entry.newState) && (
                        <div className="mt-2.5 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {entry.previousState && (
                              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                                {entry.previousState}
                              </span>
                            )}
                            {entry.previousState && entry.newState && (
                              <span className="text-gray-400">→</span>
                            )}
                            {entry.newState && (
                              <span className={`px-2 py-0.5 rounded font-medium ${
                                entry.newState === "Available"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : entry.newState === "Allocated"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                    : entry.newState === "Under Repair"
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                      : "bg-gray-100 text-gray-700"
                              }`}>
                                {entry.newState}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
