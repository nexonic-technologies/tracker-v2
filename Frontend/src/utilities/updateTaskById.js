import axiosInstance from "@api/axiosInstance";

export const updateTaskById = async (taskId, updateData) => {
  try {
    const response = await axiosInstance.put(`/populate/update/tasks/${taskId}`, updateData);
    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};
