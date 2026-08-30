import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import FloatingCard from "@components/Common/FloatingCard";
import FormRenderer from "@components/Common/FormRenderer";
import toast from "react-hot-toast";

const CRMOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approvalFormOpen, setApprovalFormOpen] = useState(false);

  const approvalFields = [
    {
      name: "approvedBy",
      label: "Approving Agent",
      type: "AutoComplete",
      source: "/populate/read/agents",
      required: true
    },
    { name: "remarks", label: "Remarks", type: "textarea" },
    { name: "signatureRef", label: "Upload Signature Copy", type: "text" }
  ];

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/order_acknowledgements", {
        limit: 1000,
        populateFields: ["clientId", "quotationId", "salesPerson", "completedBy"]
      });
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprovalSubmit = async (formData) => {
    try {
      // Simulate client approval and activate client
      await axiosInstance.put(`/populate/update/order_acknowledgements/${selectedOrder._id}`, {
        status: "Client Approved",
        clientApproval: {
          approvedBy: formData.approvedBy,
          approvedAt: new Date(),
          remarks: formData.remarks,
          signatureRef: formData.signatureRef
        }
      });

      toast.success("Order Approved by client! Client is now Active and modules are linked.");
      setApprovalFormOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      console.error("Error approving order:", err);
    }
  };

  const tableData = orders.map(o => ({
    _id: o._id,
    number: o.orderNumber,
    client: o.clientId?.name || "Unknown Client",
    quotation: o.quotationId?.quotationNumber || "Direct Order",
    value: `₹${(o.totalOrderValue || 0).toLocaleString()}`,
    status: o.status,
    salesPerson: o.salesPerson ? `${o.salesPerson.basicInfo?.firstName || ""} ${o.salesPerson.basicInfo?.lastName || ""}`.trim() : "None",
    orderData: o
  }));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-gray-800">Sales Orders / Acknowledgements</h3>
      </div>

      <TableGenerator
        data={tableData}
        hiddenColumns={["_id", "orderData"]}
        customRender={{
          status: (row) => (
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.status === "Client Approved" || row.status === "Active"
                ? "bg-green-100 text-green-800"
                : row.status === "Completed"
                  ? "bg-emerald-100 text-emerald-800"
                  : row.status === "Pending Client Approval"
                    ? "bg-amber-100 text-amber-800"
                    : row.status === "Cancelled"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}>
              {row.status}
            </span>
          ),
          number: (row) => (
            <button
              onClick={() => {
                setSelectedOrder(row.orderData);
                setDetailOpen(true);
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              {row.number}
            </button>
          )
        }}
      />

      {detailOpen && selectedOrder && (
        <FloatingCard
          title={`Order Details: ${selectedOrder.orderNumber}`}
          onClose={() => {
            setDetailOpen(false);
            setSelectedOrder(null);
          }}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client Account</p>
                <p className="font-semibold text-gray-800">{selectedOrder.clientId?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold text-gray-800">{selectedOrder.status}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-700 mb-2">Purchased Modules</h4>
              <div className="space-y-2">
                {selectedOrder.modules?.map((mod, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b text-sm">
                    <div>
                      <p className="font-semibold">{mod.description || "Project Module/Service"}</p>
                    </div>
                    <span className="font-bold">₹{mod.agreedValue?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="text-right mt-4">
                <span className="text-sm text-gray-500">Total Order Value: </span>
                <span className="text-xl font-bold text-indigo-600">₹{selectedOrder.totalOrderValue?.toLocaleString()}</span>
              </div>
            </div>

            {selectedOrder.status === "Pending Client Approval" && (
              <div className="border-t pt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setApprovalFormOpen(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                >
                  Approve as Client Agent
                </button>
              </div>
            )}
          </div>
        </FloatingCard>
      )}

      {approvalFormOpen && (
        <FloatingCard
          title={`Order Client Approval: ${selectedOrder?.orderNumber}`}
          onClose={() => {
            setApprovalFormOpen(false);
            setSelectedOrder(null);
          }}
        >
          <FormRenderer
            fields={approvalFields}
            onSubmit={handleApprovalSubmit}
          />
        </FloatingCard>
      )}
    </div>
  );
};

export default CRMOrders;
