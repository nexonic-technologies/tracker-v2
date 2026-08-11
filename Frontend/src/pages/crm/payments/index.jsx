import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import FloatingCard from "@components/Common/FloatingCard";
import FormRenderer from "@components/Common/FormRenderer";
import toast from "react-hot-toast";

const CRMPayments = () => {
  const [payments, setPayments] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const paymentFields = [
    {
      name: "clientId",
      label: "Client Account",
      type: "AutoComplete",
      source: "/populate/read/clients",
      required: true
    },
    {
      name: "orderId",
      label: "Sales Order Link",
      type: "AutoComplete",
      source: "/populate/read/order_acknowledgements"
    },
    { name: "amount", label: "Amount Received", type: "number", required: true },
    { name: "paymentDate", label: "Date of Payment", type: "date", required: true },
    {
      name: "paymentMode",
      label: "Payment Mode",
      type: "select",
      options: [
        { value: "Bank Transfer", label: "Bank Transfer" },
        { value: "Cheque", label: "Cheque" },
        { value: "UPI", label: "UPI" },
        { value: "Cash", label: "Cash" },
        { value: "Credit Card", label: "Credit Card" },
        { value: "Other", label: "Other" }
      ],
      defaultValue: "Bank Transfer"
    },
    { name: "referenceNumber", label: "Transaction / Ref Number", type: "text" },
    { name: "bankName", label: "Bank Name", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Verified", label: "Verified" }
      ],
      defaultValue: "Draft"
    }
  ];

  const fetchPayments = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/payment_journals", {
        limit: 1000,
        populateFields: ["clientId", "orderId"]
      });
      setPayments(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePaymentSubmit = async (formData) => {
    try {
      if (selectedPayment) {
        await axiosInstance.put(`/populate/update/payment_journals/${selectedPayment._id}`, formData);
        toast.success("Payment updated successfully");
      } else {
        await axiosInstance.post("/populate/create/payment_journals", formData);
        toast.success("Payment recorded successfully");
      }
      setFormOpen(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error("Error saving payment:", err);
    }
  };

  const verifyPayment = async (payment) => {
    try {
      await axiosInstance.put(`/populate/update/payment_journals/${payment._id}`, {
        status: "Verified"
      });
      toast.success("Payment verified! Client ledger debit entry recorded.");
      fetchPayments();
    } catch (err) {
      console.error("Error verifying payment:", err);
    }
  };

  const tableData = payments.map(p => ({
    _id: p._id,
    receipt: p.receiptNumber,
    client: p.clientId?.name || "Unknown Client",
    order: p.orderId?.orderNumber || "Direct Payment",
    amount: `$${(p.amount || 0).toLocaleString()}`,
    date: new Date(p.paymentDate).toLocaleDateString(),
    mode: p.paymentMode,
    ref: p.referenceNumber || "N/A",
    status: p.status,
    paymentData: p
  }));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-3xl font-bold text-gray-800">Payment Journals / Receipts</h3>
        <button
          onClick={() => {
            setSelectedPayment(null);
            setFormOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Record Payment
        </button>
      </div>

      <TableGenerator
        data={tableData}
        hiddenColumns={["_id", "paymentData"]}
        customRender={{
          status: (row) => (
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.status === "Verified"
              ? "bg-green-100 text-green-800"
              : row.status === "Cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
              }`}>
              {row.status}
            </span>
          ),
          receipt: (row) => (
            <span className="font-semibold text-gray-900">{row.receipt}</span>
          ),
          interactions: (row) => (
            <div className="flex gap-2">
              {row.status === "Draft" && (
                <button
                  onClick={() => verifyPayment(row.paymentData)}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Verify Payment
                </button>
              )}
            </div>
          )
        }}
        onEdit={(row) => {
          setSelectedPayment(row.paymentData);
          setFormOpen(true);
        }}
      />

      {formOpen && (
        <FloatingCard
          title={selectedPayment ? `Edit Payment: ${selectedPayment.receiptNumber}` : "Record Payment"}
          onClose={() => {
            setFormOpen(false);
            setSelectedPayment(null);
          }}
        >
          <FormRenderer
            fields={paymentFields}
            defaultValue={selectedPayment}
            onSubmit={handlePaymentSubmit}
          />
        </FloatingCard>
      )}
    </div>
  );
};

export default CRMPayments;
