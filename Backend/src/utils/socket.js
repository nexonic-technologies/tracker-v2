import { io } from "../index.js"; // ✅ This is correct, since index.js exports io

/**
 * Emit a notification to a specific user (receiver)
 * @param {string} receiverId - The user’s socket room ID
 * @param {object} payload - Data to send
 */
export const emitNotification = (receiverId, payload) => {
  if (!receiverId) {
    console.warn("⚠️ emitNotification called without receiverId");
    return;
  }
  io.to(receiverId.toString()).emit("notification", payload);
};
