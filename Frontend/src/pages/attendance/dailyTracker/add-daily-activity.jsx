import { useNavigate } from "react-router-dom";
import { useAuth } from "@providers/AuthProvider";
import { useGenericAPI } from "@hooks/useGenericAPI";
import FormPageLayout from "@components/Forms/FormPageLayout";
import FormRenderer from "@components/Common/FormRenderer";
import ActivityEntryFrom from "@constants/ActivityEntryFrom";
import toast from "react-hot-toast";

const AddDailyEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { create } = useGenericAPI();

  const handleSubmit = async (formData) => {
    const { clientName, projectType, activities } = formData;

    if (!clientName || !projectType || !activities?.length) {
      toast.error("Please complete all required fields.");
      return;
    }

    const payload = activities.map((act) => ({
      client: clientName._id,
      projectType: projectType._id,
      taskType: act.taskType?._id,
      activity: act.activity,
      user: user?.id,
      date: new Date(),
    }));

    try {
      await create("daily_activities", payload, "Daily entry saved");
      navigate("/Attendance/Daily-tracker");
    } catch {
      // error toast handled by useGenericAPI
    }
  };

  return (
    <FormPageLayout
      title="Add Daily Activity"
      subtitle="Log work against clients and project types"
      backTo="/Attendance/Daily-tracker"
      maxWidth="max-w-4xl"
    >
      <FormRenderer
        fields={ActivityEntryFrom}
        submitButton={{ text: "Save Activity", color: "violet" }}
        onSubmit={handleSubmit}
      />
    </FormPageLayout>
  );
};

export default AddDailyEntry;
