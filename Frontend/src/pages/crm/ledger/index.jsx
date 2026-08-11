import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";

const CRMClientLedger = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0
  });

  const fetchClients = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/clients", { limit: 1000 });
      setClients(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const fetchLedger = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await axiosInstance.post("/populate/read/clients_ledgers", {
        limit: 1000,
        filter: { clientId },
        sort: { date: 1, createdAt: 1 }
      });

      const entries = res.data?.data || [];
      setLedgerEntries(entries);

      // Compute statistics
      let billed = 0;
      let paid = 0;
      entries.forEach(entry => {
        if (entry.type === "Credit") billed += entry.amount;
        if (entry.type === "Debit") paid += entry.amount;
      });

      setSummary({
        totalBilled: billed,
        totalPaid: paid,
        outstanding: billed - paid
      });
    } catch (err) {
      console.error("Error fetching client ledger:", err);
      toast.error("Failed to load client ledger statement");
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchLedger(selectedClientId);
    } else {
      setLedgerEntries([]);
      setSummary({ totalBilled: 0, totalPaid: 0, outstanding: 0 });
    }
  }, [selectedClientId]);

  const tableData = ledgerEntries.map(entry => ({
    _id: entry._id,
    date: new Date(entry.date).toLocaleDateString(),
    type: entry.type,
    reference: entry.referenceModel === "order_acknowledgements" ? "Order Acknowledgement" : "Payment Journal",
    description: entry.description || "N/A",
    narration: entry.narration || "N/A",
    amount: `$${(entry.amount || 0).toLocaleString()}`,
    balance: `$${(entry.runningBalance || 0).toLocaleString()}`
  }));

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-800">Client Outstanding Ledger</h3>
          <p className="text-sm text-gray-500 mt-1">Select a client account to generate statement of accounts</p>
        </div>

        <div className="w-full md:w-72">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-- Choose Client Account --</option>
            {clients.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.Status === "Active" ? "Active" : "Inactive"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClientId ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <h4 className="text-sm font-semibold text-gray-500 uppercase">Total Billed (Credit)</h4>
              <p className="text-3xl font-bold text-gray-900 mt-1">${summary.totalBilled.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
              <h4 className="text-sm font-semibold text-gray-500 uppercase">Total Paid (Debit)</h4>
              <p className="text-3xl font-bold text-gray-900 mt-1">${summary.totalPaid.toLocaleString()}</p>
            </div>

            <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${summary.outstanding > 0 ? 'border-red-500' : 'border-gray-500'}`}>
              <h4 className="text-sm font-semibold text-gray-500 uppercase">Outstanding Balance</h4>
              <p className={`text-3xl font-bold mt-1 ${summary.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                ${summary.outstanding.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-xl font-semibold mb-4 text-gray-700">Account Statement</h4>
            {ledgerEntries.length > 0 ? (
              <TableGenerator
                data={tableData}
                hiddenColumns={["_id"]}
                customRender={{
                  type: (row) => (
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.type === "Credit"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                      }`}>
                      {row.type === "Credit" ? "Credit (Billed)" : "Debit (Paid)"}
                    </span>
                  )
                }}
              />
            ) : (
              <div className="p-8 text-center text-gray-500">
                No ledger transactions found for this account.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-lg shadow border border-dashed border-gray-300">
          <p className="text-gray-500">Please choose a client from the dropdown to load their outstanding ledger statement.</p>
        </div>
      )}
    </div>
  );
};

export default CRMClientLedger;
