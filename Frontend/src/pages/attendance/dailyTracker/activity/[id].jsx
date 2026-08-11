import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGenericAPI from "../../../../components/useGenericAPI";
import Activity from "../activity";
import FormPageLayout from "../../../../components/Forms/FormPageLayout";

const ActivityDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { read, loading } = useGenericAPI();
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchActivity = async () => {
      try {
        const res = await read("daily_activities", {
          id,
          populateFields: {
            projectType: "name",
            activityType: "name",
            client: "name",
            user: "basicInfo.firstName,basicInfo.lastName",
          },
        });
        setActivity(res?.data ?? null);
      } catch {
        // error toast handled by useGenericAPI
      }
    };
    fetchActivity();
  }, [id]);

  if (loading) {
    return (
      <FormPageLayout title="Activity" backTo="/Attendance/Daily-tracker">
        <div className="py-12 text-center text-ink-muted">Loading activity...</div>
      </FormPageLayout>
    );
  }

  if (!activity) {
    return (
      <FormPageLayout title="Activity" backTo="/Attendance/Daily-tracker">
        <div className="py-12 text-center text-ink-muted">Activity not found</div>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout
      title="Activity Details"
      backTo="/Attendance/Daily-tracker"
      maxWidth="max-w-4xl"
    >
      <Activity activity={activity} onClose={() => navigate("/Attendance/Daily-tracker")} />
    </FormPageLayout>
  );
};

export default ActivityDetailPage;
