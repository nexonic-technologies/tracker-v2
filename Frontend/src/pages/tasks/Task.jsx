import { useState, useEffect } from "react";
import InlineEdit from "@components/Common/InLineEdit";
import { useAuth } from "@providers/AuthProvider";
import { updateTaskById } from "@utilities/updateTaskById";
import AddComment from "@components/Common/AddComment";

export default function Task({ task, fetchTask, onStatusChange }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // 🔥 Maintain local state copy so UI refreshes instantly
  const [localTask, setLocalTask] = useState(task);

  // sync if parent sends new data
  useEffect(() => setLocalTask(task), [task?._id]);

  useEffect(() => {
    if (user && task?.createdBy?._id === user.id) setCanEdit(true);
  }, [user?.id, task?._id]);

  // 🔥 update backend + local UI immediately
  const handleInlineUpdate = async (field, value) => {
    try {
      setSaving(true);

      // update local task instantly (to refresh UI)
      setLocalTask(prev => ({ ...prev, [field]: value }));

      await updateTaskById(task._id, { [field]: value });
      await fetchTask(); // refresh from DB as final source of truth
    } finally {
      setSaving(false);
    }
  };

  const STATUS_COLORS = {
    Backlogs: "#111111d3",
    "To Do": "#FFA500",
    "In Progress": "#FF8A8A",
    "In Review": "#3B82F6",
    Approved: "#6EE7B7",
    Rejected: "#B91C1C",
    Completed: "#166534",
  };

  const STATUS_LIST = [
    "Backlogs",
    "To Do",
    "In Progress",
    "In Review",
    "Approved",
    "Rejected",
    "Completed",
    "Deleted",
  ];

  return (
    <div className="p-4 mt-4">

      {/* STATUS DROPDOWN */}
      <div className="relative mb-3">
        <span
          className="flex justify-between items-center text-white p-2 pl-4 text-1xl font-normal rounded w-48 cursor-pointer"
          style={{ backgroundColor: STATUS_COLORS[localTask.status] }}
          onClick={() => canEdit && setShowStatusMenu(!showStatusMenu)}
        >
          {localTask.status}
          {canEdit && <span className="ml-2 text-lg">▼</span>}
        </span>

        {showStatusMenu && (
          <div className="absolute mt-1 w-48 bg-gray-800 text-white rounded shadow-lg overflow-hidden z-20">
            {STATUS_LIST.map((status) => (
              <div
                key={status}
                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${status === localTask.status ? "bg-gray-700 font-semibold" : ""
                  }`}
                onClick={() => {
                  setShowStatusMenu(false);
                  onStatusChange(localTask._id, status);
                }}
              >
                {status}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TITLE */}
      <div className="mb-4">
        <InlineEdit
          value={localTask.title}
          canEdit={canEdit}
          onSave={(v) => handleInlineUpdate("title", v)}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">

        {/* LEFT */}
        <div className="p-2 col-span-3 space-y-2">

          {localTask.referenceUrl && (
            <p>
              <a href={localTask.referenceUrl} className="text-blue-600 underline" target="_blank">
                {localTask.referenceUrl}
              </a>
            </p>
          )}

          <p><strong>Category</strong></p>
          <p>{localTask.taskTypeId?.name}</p>

          <p><strong>User Story</strong></p>
          <InlineEdit
            value={localTask.userStory || "—"}
            canEdit={canEdit}
            onSave={(v) => handleInlineUpdate("userStory", v)}
          />

          <p><strong>Observation</strong></p>
          <InlineEdit
            value={localTask.observation || "—"}
            canEdit={canEdit}
            onSave={(v) => handleInlineUpdate("observation", v)}
          />

          <p><strong>Impacts</strong></p>
          <InlineEdit
            value={localTask.impacts || "—"}
            canEdit={canEdit}
            onSave={(v) => handleInlineUpdate("impacts", v)}
          />

          <p><strong>Acceptance Criteria</strong></p>
          <InlineEdit
            value={localTask.acceptanceCreteria || "—"}
            canEdit={canEdit}
            onSave={(v) => handleInlineUpdate("acceptanceCreteria", v)}
          />

          {/* COMMENTS / ACTIVITY SECTION */}
          <div className="mt-8 border-t pt-6">
            <div className="flex space-x-6 border-b pb-2 mb-4">
              <button className="font-semibold text-blue-700">Activities</button>
              <button className="text-gray-500 hover:text-blue-600">Comments</button>
            </div>

            {/* Render Activity Items */}
            {localTask.commentsThreadDetails?.comments?.map((c) => (
              <div key={c._id} className="mb-4 flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={`https://ui-avatars.com/api/?name=${c.commentedBy?.basicInfo?.firstName || "U"}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <p className="text-sm">
                    <span className="font-semibold text-blue-700">
                      {c.commentedBy?.basicInfo?.firstName}
                    </span>{" "}
                    {c.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {/* COMMENT INPUT */}
            <AddComment
              threadId={localTask.commentsThreadDetails?._id}
              onAdded={async () =>
                fetchTask().then((updated) => setLocalTask(updated))
              }
            />
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-1 border-l pl-6">
          <p><strong>Start Date</strong></p>
          <p>{localTask.startDate ? new Date(localTask.startDate).toLocaleDateString() : "Not Set Yet"}</p>

          <p><strong>End Date</strong></p>
          <p>{localTask.endDate ? new Date(localTask.endDate).toLocaleDateString() : "Not Yet Set"}</p>

          <p><strong>Priority</strong></p>
          <p>{localTask.priorityLevel}</p>

          <p><strong>Tags</strong></p>
          <InlineEdit
            value={localTask.tags?.join(", ") || "No Tags"}
            canEdit={canEdit}
            onSave={(v) => {
              const newTags = v.split(",").map(tag => tag.trim()).filter(Boolean);
              handleInlineUpdate("tags", newTags);
            }}
          />

          <hr className="my-3" />

          <p>About Task</p>
          <p>{localTask.createdBy?.basicInfo?.firstName}</p>
          <p>{localTask.clientId?.name}</p>
        </div>
      </div>

      {saving && <p className="text-sm text-yellow-700 mt-3">Saving...</p>}
    </div>
  );
}
