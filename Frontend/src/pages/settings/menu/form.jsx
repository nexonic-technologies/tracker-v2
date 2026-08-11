import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import EntityFormPage from "@components/Forms/EntityFormPage";
import { SidebarForm } from "../../../constants/SidebarFrom";
import toast from "react-hot-toast";
import { Plus, Trash2, Sparkles, Package, Loader2 } from "lucide-react";

// ─── Capability Manager Component ──────────────────────────────────
const CapabilityManager = ({ formValues, onChange }) => {
  const [allCapabilities, setAllCapabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCap, setNewCap] = useState({
    key: '',
    module: '',
    label: '',
    description: '',
    type: 'ui',
    action: 'view',
    resourceKey: ''
  });

  // Fetch all capabilities
  useEffect(() => {
    const fetchCapabilities = async () => {
      setLoading(true);
      try {
        const capsRes = await axiosInstance.post("populate/read/capabilities", {
          filter: { status: 'active' },
          limit: 1000
        });
        setAllCapabilities(capsRes.data?.data || []);
      } catch (err) {
        console.error("[CapabilityManager] Fetch error:", err);
        toast.error("Failed to load capabilities");
      } finally {
        setLoading(false);
      }
    };
    fetchCapabilities();
  }, []);

  // Toggle capability selection
  const toggleCapability = (capId) => {
    const currentCaps = formValues?.capabilities || [];
    const exists = currentCaps.includes(capId);
    const newCaps = exists
      ? currentCaps.filter(id => id !== capId)
      : [...currentCaps, capId];

    onChange({ capabilities: newCaps });
  };

  // Create new capability
  const handleCreateCapability = async (e) => {
    e.preventDefault();
    if (!newCap.key || !newCap.label || !newCap.module) {
      toast.error("Key, Label, and Module are required");
      return;
    }

    setCreating(true);
    try {
      const res = await axiosInstance.post("populate/create/capabilities", {
        ...newCap,
        status: 'active'
      });

      const createdCap = res.data?.data;
      if (createdCap) {
        const capId = createdCap._id?.$oid || createdCap._id;

        // Add to form values
        const currentCaps = formValues?.capabilities || [];
        onChange({ capabilities: [...currentCaps, capId] });

        // Add to local list
        setAllCapabilities(prev => [...prev, createdCap]);

        toast.success(`Created "${newCap.name}"`);

        // Reset form
        setNewCap({
          key: '',
          module: '',
          label: '',
          description: '',
          type: 'ui',
          action: 'view',
          resourceKey: ''
        });
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error("Create capability error:", err);
      toast.error(err.response?.data?.message || "Failed to create capability");
    } finally {
      setCreating(false);
    }
  };

  // Filter capabilities by search term
  const filteredCapabilities = allCapabilities.filter(cap => {
    const search = searchTerm.toLowerCase();
    return cap.key.toLowerCase().includes(search) ||
      cap.label.toLowerCase().includes(search) ||
      cap.module.toLowerCase().includes(search);
  });

  const selectedCapIds = formValues?.capabilities || [];

  return (
    <div className="space-y-4">
      {/* Search & Create Button */}
      <div className="tracker-card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search capabilities by key, label, or module..."
            className="tracker-input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="tracker-btn-primary flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New
          </button>
        </div>
      </div>

      {/* Create Capability Form */}
      {showCreateForm && (
        <div className="tracker-card p-4 space-y-3 border-accent/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Create New Capability</h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-ink-muted hover:text-ink text-xs"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateCapability} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Key *</label>
                <input
                  type="text"
                  value={newCap.key}
                  onChange={e => setNewCap({ ...newCap, key: e.target.value })}
                  placeholder="e.g., dashboard:view"
                  className="tracker-input text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Module *</label>
                <input
                  type="text"
                  value={newCap.module}
                  onChange={e => setNewCap({ ...newCap, module: e.target.value })}
                  placeholder="e.g., Dashboard"
                  className="tracker-input text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-muted mb-1 block">Label *</label>
              <input
                type="text"
                value={newCap.label}
                onChange={e => setNewCap({ ...newCap, label: e.target.value })}
                placeholder="e.g., View Dashboard"
                className="tracker-input text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs text-ink-muted mb-1 block">Description</label>
              <input
                type="text"
                value={newCap.description}
                onChange={e => setNewCap({ ...newCap, description: e.target.value })}
                placeholder="Capability description"
                className="tracker-input text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Type</label>
                <select
                  value={newCap.type}
                  onChange={e => setNewCap({ ...newCap, type: e.target.value })}
                  className="tracker-input text-sm"
                >
                  <option value="ui">UI (Sidebar)</option>
                  <option value="business">Business (Action)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Action *</label>
                <input
                  type="text"
                  list="inline-action-suggestions"
                  value={newCap.action}
                  onChange={e => setNewCap({ ...newCap, action: e.target.value })}
                  placeholder="e.g., view"
                  className="tracker-input text-sm"
                  required
                />
                <datalist id="inline-action-suggestions">
                  <option value="menu" />
                  <option value="view" />
                  <option value="read" />
                  <option value="create" />
                  <option value="update" />
                  <option value="delete" />
                </datalist>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Resource Key</label>
                <input
                  type="text"
                  value={newCap.resourceKey}
                  onChange={e => setNewCap({ ...newCap, resourceKey: e.target.value })}
                  placeholder="e.g., employee"
                  className="tracker-input text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="tracker-btn-primary flex items-center gap-1.5 text-xs px-4 py-2 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create & Select
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Capabilities List */}
      <div className="tracker-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            Available Capabilities ({filteredCapabilities.length})
          </h3>
          <span className="text-xs text-ink-muted">
            Selected: {selectedCapIds.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 border-2 border-hairline border-t-accent rounded-full animate-spin" />
          </div>
        ) : filteredCapabilities.length === 0 ? (
          <div className="text-center py-6 text-ink-muted text-sm">
            {searchTerm ? "No capabilities match your search." : "No capabilities found. Click 'Create New' to add capabilities."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
            {filteredCapabilities.map(cap => {
              const isSelected = selectedCapIds.includes(cap._id?.$oid || cap._id);
              const capId = cap._id?.$oid || cap._id;

              return (
                <div
                  key={capId}
                  onClick={() => toggleCapability(capId)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-tracker-md border cursor-pointer transition-colors ${isSelected
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-canvas-muted/50 border-hairline-soft hover:border-accent/20'
                    }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-accent border-accent text-white' : 'border-hairline bg-canvas'
                      }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-accent truncate">{cap.key}</code>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${cap.type === 'ui'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          }`}>
                          {cap.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-subtle truncate mt-0.5">{cap.label}</p>
                      <p className="text-[10px] text-ink-muted truncate">{cap.module}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="tracker-card p-4">
        <p className="text-xs text-ink-muted">
          <strong>Tip:</strong> Select the capabilities required to view this menu item.
          Users must have at least one of these capabilities in their role to see this menu.
          Click "Create New" to add capabilities inline.
        </p>
      </div>
    </div>
  );
};

// ─── Tab Definitions ───────────────────────────────────────────────
const MENU_FORM_TABS = [
  {
    id: "item",
    label: "Menu Item",
    fieldNames: ["title", "mainRoute", "icon.iconName", "icon.iconPackage", "parentId", "order"],
  },
  {
    id: "capabilities",
    label: "Capabilities",
    fieldNames: ["capabilities"],
  },
];

// ─── Main Form Page ────────────────────────────────────────────────
const MenuFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [record, setRecord] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [initialDataForTab, setInitialDataForTab] = useState({});
  const [fetching, setFetching] = useState(Boolean(id));
  const [activeTab, setActiveTab] = useState("item");

  // Load record for edit mode
  useEffect(() => {
    if (!id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await axiosInstance.get(`populate/read/sidebars/${id}`, {
          params: {
            populateFields: JSON.stringify([
              { path: "capabilities", select: "key label module type" },
              { path: "parentId", select: "title" }
            ])
          }
        });
        const item = res.data?.data;
        if (item?._id?.$oid) item._id = item._id.$oid;

        // Convert capabilities to array of IDs
        const capIds = item?.capabilities?.map(c => c._id?.$oid || c._id) || [];

        setRecord(item);
        setFormValues({ ...item, capabilities: capIds });
        setInitialDataForTab({ ...item, capabilities: capIds });
      } catch (err) {
        toast.error("Failed to load menu item");
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  const handleFormChange = useCallback((updated) => {
    setFormValues((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleTabChange = (tabId) => {
    setInitialDataForTab(formValues);
    setActiveTab(tabId);
  };

  const handleSubmit = async (formData) => {
    const mergedData = { ...formValues, ...formData };
    const hasParent = !!(mergedData.parentId?._id || mergedData.parentId);

    const rawPayload = {
      ...mergedData,
      isActive: mergedData.isActive === undefined ? true : mergedData.isActive === "true" || mergedData.isActive === true,
      isParent: !hasParent,        // If no parent, it IS a parent
      hasChildren: !hasParent,     // Parents can have children
      parentId: mergedData.parentId?._id || mergedData.parentId || null,
      capabilities: mergedData.capabilities || [],
      visibility: "protected",    // Always protected — CBAC controls visibility
    };

    // Strip read-only properties to prevent validation errors on submit
    const { _id, id: skipId, createdAt, updatedAt, __v, ...payload } = rawPayload;

    try {
      if (id) {
        await axiosInstance.put(`populate/update/sidebars/${id}`, payload);
        toast.success("Menu item updated");
      } else {
        await axiosInstance.post("populate/create/sidebars", payload);
        toast.success("Menu item created");
      }
      navigate("/settings/menu");
    } catch (err) {
      console.error("Menu save error:", err);
      toast.error(err.response?.data?.message || "Save failed");
      throw err;
    }
  };

  if (fetching) {
    return (
      <div className="p-6">
        <div className="py-16 flex justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-canvas-muted dark:bg-canvas min-h-full">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/settings/menu")}
          className="text-sm text-accent hover:underline mb-2 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-ink">{id ? "Edit" : "Add"} Menu item</h1>
        <p className="text-ink-muted text-sm">Sidebar navigation entry</p>
      </div>

      {/* Tabs */}
      <div className="tracker-card overflow-hidden">
        <div className="flex border-b border-hairline-soft">
          {MENU_FORM_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                  ? "text-accent border-accent"
                  : "text-ink-muted border-transparent hover:text-ink hover:border-hairline"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "item" && (
            <EntityFormPage
              title="Menu item"
              subtitle="Sidebar navigation entry"
              backTo="/settings/menu"
              fields={SidebarForm.filter(f => MENU_FORM_TABS[0].fieldNames.includes(f.name))}
              submitButton={{ text: id ? "Update menu item" : "Create menu item", color: "blue" }}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
              data={initialDataForTab}
            />
          )}

          {activeTab === "capabilities" && (
            <div className="space-y-4">
              {/* Capabilities Manager */}
              <CapabilityManager
                formValues={formValues}
                onChange={handleFormChange}
              />

              <div className="flex justify-end pt-4 border-t border-hairline-soft">
                <button
                  type="button"
                  onClick={() => handleSubmit(formValues)}
                  className="tracker-btn-primary px-6 py-2 text-sm font-medium"
                >
                  {id ? "Update menu item" : "Create menu item"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuFormPage;
