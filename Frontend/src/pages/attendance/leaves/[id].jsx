import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import FloatingCard from "../../../components/Common/FloatingCard.jsx";
import LeaveDetailModal from "@components/Attendance/LeaveDetailModal";
import toast, { Toaster } from "react-hot-toast";

export default function DetailModalRoute() {
  const { id } = useParams();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);               // close modal visually
  };

  const onApprove = () => {
    toast.success("Leave request Approved successfully!");
  }

  const onReject = () => {
    toast.success("Leave request Rejected successfully!");
  }

  if (!open) return null; // just hide, don't navigate here

  return (
    <>
      <Toaster position="top-right" />
      <FloatingCard onClose={handleClose}>
        <LeaveDetailModal
          onApprove={onApprove}
          onReject={onReject}
          id={id}
          onClose={handleClose} />
      </FloatingCard>
    </>
  );
}
