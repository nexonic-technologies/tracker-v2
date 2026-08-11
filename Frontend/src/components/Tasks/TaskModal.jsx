import { useState, useEffect, useRef } from "react";
import { useAuth } from "@providers/AuthProvider";
import axiosInstance from "@api/axiosInstance";
import InlineEdit from "@components/Common/InLineEdit";
import { updateTaskById } from "@utilities/updateTaskById";
import { MdAdd, MdPlayArrow, MdSchedule, MdFlag, MdLabel, MdPersonAdd, MdMoreVert, MdContentCopy, MdDelete } from "react-icons/md";
import toast from "react-hot-toast";
import ShareButton from "@utilities/Sharebutton";
import ProfileImage from "@components/Common/ProfileImage";

const TaskModal = ({ task, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (task?._id) {
      fetchTaskWithPopulation();
      fetchComments();
      fetchEmployees();
    }
  }, [task?._id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAssignDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchTaskWithPopulation = async () => {
    try {
      const populateFields = {
        'assignedTo': 'basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage',
        'createdBy': 'basicInfo.firstName,basicInfo.lastName',
        'clientId': 'name,milestones'
      };
      const response = await axiosInstance.post(`/populate/read/tasks/${task._id}`, {
        populateFields
      });

      let taskData = response.data.data;

      if (taskData.assignedTo && taskData.assignedTo.length > 0 && typeof taskData.assignedTo[0] === 'string') {
        const populatedAssignedTo = await Promise.all(
          taskData.assignedTo.map(async (userId) => {
            try {
              const userResponse = await axiosInstance.post(`/populate/read/employees/${userId}`, {
                fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage"
              });
              return userResponse.data.data;
            } catch (error) {
              console.error('Error fetching user:', error);
              return { _id: userId, basicInfo: {} };
            }
          })
        );
        taskData.assignedTo = populatedAssignedTo;
      }

      setFormData(taskData);
    } catch (error) {
      console.error('Error fetching task with population:', error);
      setFormData(task);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.post('/populate/read/employees', { fields: "basicInfo.firstName,basicInfo.lastName" });
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchComments = async () => {
    if (!task.commentsThread) return;
    try {
      const threadId = typeof task.commentsThread === 'object' ? task.commentsThread._id : task.commentsThread;
      if (!threadId) return;

      const populateFields = {
        "comments.commentedBy": "basicInfo.firstName,basicInfo.lastName"
      };
      const url = `/populate/read/comments_threads/${threadId}`;
      const response = await axiosInstance.post(url, { populateFields });

      const commentsWithUsers = await Promise.all(
        (response.data.data?.comments || []).map(async (comment) => {
          if (typeof comment.commentedBy === 'string') {
            try {
              const userResponse = await axiosInstance.post(`/populate/read/employees/${comment.commentedBy}`, {
                fields: "basicInfo.firstName,basicInfo.lastName"
              });
              return {
                ...comment,
                commentedBy: userResponse.data.data
              };
            } catch (error) {
              console.error('Error fetching user:', error);
              return comment;
            }
          }
          return comment;
        })
      );

      setComments(commentsWithUsers);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleFieldUpdate = async (field, value) => {
    try {
      await updateTaskById(task._id, { [field]: value });
      setFormData(prev => ({ ...prev, [field]: value }));
      toast.success('Task updated successfully');
      onUpdate();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error('Failed to update task');
    }
  };

  const handleFollowTask = async () => {
    try {
      const currentFollowers = formData.followers || [];
      const updatedFollowers = [...currentFollowers, user.id];
      await handleFieldUpdate('followers', updatedFollowers);
      toast.success('You are now following this task');
    } catch (error) {
      toast.error('Failed to follow task');
    }
  };

  const handleUnassignUser = async (userId) => {
    try {
      const currentAssigned = (formData.assignedTo || []).filter(Boolean);
      const updatedAssigned = currentAssigned.filter(u => u._id !== userId);
      await updateTaskById(task._id, { assignedTo: updatedAssigned.map(u => u._id) });

      setFormData(prev => ({
        ...prev,
        assignedTo: updatedAssigned
      }));
      toast.success('User unassigned successfully');
    } catch (error) {
      toast.error('Failed to unassign user');
    }
  };

  const handleAssignUser = async (userId) => {
    try {
      const currentAssigned = (formData.assignedTo || []).filter(Boolean);
      const updatedAssigned = [...currentAssigned.map(u => u._id), userId];
      await updateTaskById(task._id, { assignedTo: updatedAssigned });

      const userResponse = await axiosInstance.post(`/populate/read/employees/${userId}`, {
        fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage"
      });
      const newUser = userResponse.data.data;

      setFormData(prev => ({
        ...prev,
        assignedTo: [...currentAssigned, newUser]
      }));
      toast.success('User assigned successfully');
    } catch (error) {
      toast.error('Failed to assign user');
    }
  };

  const copyTaskUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Task URL copied to clipboard');
    setShowMoreMenu(false);
  };

  const deleteTask = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await updateTaskById(task._id, { status: 'Deleted' });
        toast.success('Task deleted successfully');
        onClose();
        onUpdate();
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
    setShowMoreMenu(false);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      if (!task.commentsThread) {
        console.error('No comment thread found for task');
        toast.error('Comment thread not found');
        return;
      }

      const finalThreadId = typeof task.commentsThread === 'object' ? task.commentsThread._id : task.commentsThread;
      await axiosInstance.put(`/populate/update/comments_threads/${finalThreadId}`, {
        $push: {
          comments: {
            commentedBy: user.id,
            message: newComment,
            mentions: []
          }
        }
      });

      setNewComment("");
      fetchComments();
      onUpdate();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    'Backlogs': 'bg-gray-500',
    'To Do': 'bg-orange-500',
    'In Progress': 'bg-blue-500',
    'In Review': 'bg-purple-500',
    'Approved': 'bg-green-500',
    'Rejected': 'bg-red-500',
    'Completed': 'bg-green-700'
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <select
          value={formData.status || ''}
          onChange={(e) => handleFieldUpdate('status', e.target.value)}
          className={`px-3 py-1 rounded text-white text-sm border-none ${statusColors[formData.status] || 'bg-gray-500'}`}
        >
          <option value="Backlogs">Reported (Backlogs)</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="In Review">In Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Completed">Completed</option>
        </select>

        <div className="flex items-center gap-2 flex-1">
          <div className="relative" ref={dropdownRef}>
            {formData.assignedTo?.filter(Boolean).length > 0 ? (
              formData.assignedTo.filter(Boolean).length === 1 ? (
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAssignDropdown(!showAssignDropdown);
                  }}
                  title="Click to manage assignment"
                >
                  {formData.assignedTo[0].basicInfo?.profileImage ? (
                    <ProfileImage
                      profileImage={formData.assignedTo[0].basicInfo.profileImage}
                      firstName={formData.assignedTo[0].basicInfo.firstName}
                      lastName={formData.assignedTo[0].basicInfo.lastName}
                      px={32}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center border-2 border-white shadow-sm">
                      {formData.assignedTo[0].basicInfo?.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {formData.assignedTo[0].basicInfo?.firstName} {formData.assignedTo[0].basicInfo?.lastName}
                  </span>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAssignDropdown(!showAssignDropdown);
                  }}
                >
                  <span className="text-sm font-medium text-gray-700">
                    {formData.assignedTo.filter(Boolean).length} users assigned
                  </span>
                </div>
              )
            ) : (
              <div
                className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAssignDropdown(!showAssignDropdown);
                }}
              >
                <span className="text-gray-500 text-sm">No assignee</span>
              </div>
            )}

            {showAssignDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg py-1 z-20 min-w-48">
                {employees.map(emp => {
                  const isAssigned = formData.assignedTo?.some(u => u._id === emp._id);
                  return (
                    <div
                      key={emp._id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAssigned) {
                          handleUnassignUser(emp._id);
                        } else {
                          handleAssignUser(emp._id);
                        }
                      }}
                    >
                      <span className="text-sm">
                        {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                      </span>
                      {isAssigned && (
                        <span className="text-green-500 font-bold">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {formData.createdBy?._id !== user.id && !formData.followers?.includes(user.id) && (
            <button
              onClick={handleFollowTask}
              className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              <MdPersonAdd size={16} />
              Follow
            </button>
          )}

          <div className="relative ml-auto">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MdMoreVert size={20} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-8 bg-white border rounded shadow-lg py-1 z-10">
                <div className="px-3 py-2">
                  <ShareButton model="tasks" id={task._id} variant="button" className="text-sm" />
                </div>
                <button
                  onClick={deleteTask}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left text-red-600"
                >
                  <MdDelete size={16} />
                  Delete Task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-full">
        <div className="w-3/4 pr-6">
          <div className="text-2xl font-bold mb-4">
            <InlineEdit
              value={formData.title}
              onSave={(value) => handleFieldUpdate('title', value)}
              canEdit={true}
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Category</h3>
              <div className="text-blue-600">
                <InlineEdit
                  value={formData.projectTypeId?.name || 'Support request'}
                  onSave={(value) => handleFieldUpdate('category', value)}
                  canEdit={true}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">User story</h3>
              <div className="text-gray-800">
                <InlineEdit
                  value={formData.userStory || 'The bill copy alignment needs to be adjusted slightly lower.'}
                  onSave={(value) => handleFieldUpdate('userStory', value)}
                  canEdit={true}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Observation</h3>
              <div className="text-gray-600">
                <InlineEdit
                  value={formData.observation || '-'}
                  onSave={(value) => handleFieldUpdate('observation', value)}
                  canEdit={true}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Impacts</h3>
              <p className="text-gray-600">-</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Acceptance criteria</h3>
              <div className="text-gray-600">
                <InlineEdit
                  value={formData.acceptanceCreteria || '-'}
                  onSave={(value) => handleFieldUpdate('acceptanceCreteria', value)}
                  canEdit={true}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex gap-4 mb-4">
              <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded font-medium">Activities</button>
              <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Comments</button>
            </div>

            <div className="space-y-4 mb-4">
              {comments.map((comment, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                    ✓
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{comment.commentedBy?.basicInfo?.firstName}</span> has created the Task.
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Your thoughts on this..."
                className="flex-1 p-2 border rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
              />
            </div>
          </div>
        </div>

        <div className="w-1/4 pl-6 border-l">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MdPlayArrow className="text-green-500" size={20} />
              <span className="font-mono text-lg">00:00:00</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MdSchedule className="text-orange-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Start date</p>
                  <p className="text-sm font-medium">Not set yet</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MdSchedule className="text-orange-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Due on</p>
                  <p className="text-sm font-medium">Not set yet</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MdSchedule className="text-orange-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Reminder</p>
                  <p className="text-sm font-medium">Not set yet *</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MdFlag className="text-orange-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className="text-sm font-medium">{formData.priorityLevel || 'None'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MdLabel className="text-blue-500" size={16} />
                <div>
                  <p className="text-sm text-gray-600">Tags</p>
                  <p className="text-sm font-medium">No tags added</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">About the Task</h4>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created By</p>
                  <p title="Created By" className="font-medium">{formData.createdBy?.basicInfo?.firstName} {formData.createdBy?.basicInfo?.lastName}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Client</p>
                  <p title="Client Name" className="font-medium">{formData.clientId?.name || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Milestone</p>
                  <select
                    value={formData.milestoneId || ''}
                    onChange={(e) => handleFieldUpdate('milestoneId', e.target.value)}
                    className="w-full p-1.5 border rounded bg-white text-sm"
                  >
                    <option value="">No Milestone</option>
                    {formData.clientId?.milestones?.map(m => (
                      <option key={m.milestoneId} value={m.milestoneId}>
                        {m.notes || 'Unnamed Milestone'} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p title="Category" className="font-medium">{formData.projectTypeId?.name || 'Support request'}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Created At</p>
                  <p title="Created At" className="font-medium">{new Date(formData.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
