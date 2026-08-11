import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "@components/StatusBadge";
import { MdAdd, MdClose } from "react-icons/md";
import { Country, State, City } from "country-state-city";
import SearchableDropdown from "../../components/Common/SearchableDropdown";


// Helper to resolve Country Name -> ISO Code
const getCountryCode = (countryName) => {
  if (!countryName) return "";
  const country = Country.getAllCountries().find(
    c => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country ? country.isoCode : "";
};

// Helper to resolve State Name -> ISO Code within Country
const getStateCode = (countryCode, stateName) => {
  if (!countryCode || !stateName) return "";
  const state = State.getStatesOfCountry(countryCode).find(
    s => s.name.toLowerCase() === stateName.toLowerCase()
  );
  return state ? state.isoCode : "";
};


const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstIN, setGstIN] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("India");
  const [status, setStatus] = useState("Active");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/assets_vendors", { limit: 1000 });
      setVendors(res.data?.data || []);
    } catch (error) {
      console.error("Error loading vendors:", error);
      toast.error("Failed to load vendors list.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setGstIN("");
    setStreet("");
    setCity("");
    setStateVal("");
    setZip("");
    setCountry("India");
    setStatus("Active");
    setModalOpen(true);
  };

  const handleOpenEditModal = (vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name || "");
    setContactPerson(vendor.contactPerson || "");
    setEmail(vendor.email || "");
    setPhone(vendor.phone || "");
    setGstIN(vendor.gstIN || "");
    setStreet(vendor.address?.street || "");
    setCity(vendor.address?.city || "");
    setStateVal(vendor.address?.state || "");
    setZip(vendor.address?.zip || "");
    setCountry(vendor.address?.country || "India");
    setStatus(vendor.status || "Active");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vendor Name is required.");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      gstIN: gstIN.trim().toUpperCase() || undefined,
      address: {
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: stateVal.trim() || undefined,
        zip: zip.trim() || undefined,
        country: country.trim() || undefined
      },
      status
    };

    try {
      if (editingVendor) {
        await axiosInstance.put(`/populate/update/assets_vendors/${editingVendor._id}`, payload);
        toast.success("Vendor updated successfully");
      } else {
        await axiosInstance.post("/populate/create/assets_vendors", payload);
        toast.success("Vendor created successfully");
      }
      fetchVendors();
      setModalOpen(false);
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error(error.response?.data?.message || "Failed to save vendor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${row.name}"?`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/assets_vendors/${row._id}`);
      toast.success("Vendor deleted successfully");
      fetchVendors();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error(error.response?.data?.message || "Failed to delete vendor.");
    }
  };

  // Prepare table data
  const tableData = vendors.map(v => ({
    _id: v._id,
    name: v.name,
    contactPerson: v.contactPerson || "—",
    email: v.email || "—",
    phone: v.phone || "—",
    gstIN: v.gstIN || "—",
    status: v.status || "Active",
    address: v.address ? `${v.address.city || ""}, ${v.address.state || ""}` : "—"
  }));

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Vendor Directory</h1>
          <p className="text-sm text-ink-muted mt-1">Manage corporate hardware and service vendors for WorkHub.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="tracker-btn-accent flex items-center gap-1.5 px-4 py-2"
        >
          <MdAdd className="text-lg" />
          Add Vendor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="tracker-card-plain overflow-hidden">
          <TableGenerator
            title="Suppliers and Service Vendors"
            data={tableData}
            hiddenColumns={["_id", "address"]}
            onEdit={handleOpenEditModal}
            onDelete={handleDelete}
            customColumns={["name", "contactPerson", "email", "phone", "gstIN", "status"]}
            customRender={{
              status: (row) => <StatusBadge status={row.status} />
            }}
          />
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-tracker-overlay animate-fade-in animate-fade-in-up p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-hairline">
              <h3 className="text-base font-bold text-ink">
                {editingVendor ? "Edit Vendor Details" : "Add New Vendor"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="lmx-input"
                  placeholder="e.g. WorkHub Electronics Co"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="lmx-input"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={gstIN}
                    onChange={(e) => setGstIN(e.target.value)}
                    className="lmx-input"
                    placeholder="e.g. 33AAAAA1111A1Z1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lmx-input"
                    placeholder="e.g. vendor@workhub.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="lmx-input"
                    placeholder="e.g. +91 99999 88888"
                  />
                </div>
              </div>

              <div className="border-t border-hairline pt-3 mt-3">
                <span className="block text-xs font-bold text-ink mb-3 uppercase tracking-wider">Address Details</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-ink-muted mb-1">Street Address</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="lmx-input"
                      placeholder="Street name, suite, or building"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-ink-muted mb-1">Country</label>
                      <SearchableDropdown
                        placeholder="Select Country"
                        value={country}
                        options={Country.getAllCountries().map((c) => c.name)}
                        onChange={(val) => {
                          setCountry(val);
                          setStateVal("");
                          setCity("");
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-muted mb-1">State / Province</label>
                      <SearchableDropdown
                        placeholder="Select State"
                        value={stateVal}
                        disabled={!country}
                        options={country ? State.getStatesOfCountry(getCountryCode(country)).map((s) => s.name) : []}
                        onChange={(val) => {
                          setStateVal(val);
                          setCity("");
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-ink-muted mb-1">City</label>
                      <SearchableDropdown
                        placeholder="Select City"
                        value={city}
                        disabled={!stateVal}
                        options={(country && stateVal) ? City.getCitiesOfState(
                          getCountryCode(country),
                          getStateCode(getCountryCode(country), stateVal)
                        ).map((c) => c.name) : []}
                        onChange={(val) => setCity(val)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink-muted mb-1">ZIP / Postal Code</label>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value.trim().replace(/\D/g, "").slice(0, 6))}
                        className="lmx-input"
                        placeholder="e.g. 600001"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase">Status</label>
                <SearchableDropdown
                  value={status}
                  options={["Active", "Inactive"]}
                  onChange={(val) => setStatus(val)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="tracker-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="tracker-btn-accent"
                >
                  {submitting ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
