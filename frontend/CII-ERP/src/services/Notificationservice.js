import API from "../../api/api"; // adjust the relative path to wherever api.js actually lives

/**
 * Fetch one page of notifications.
 * @param {string} tabId - optional backend category
 * @param {string|undefined} cursor - user_notification_id of the last item on the previous page
 */
export async function fetchNotifications(tabId = "All", cursor) {
  const params = {};
  if (tabId && tabId !== "All") params.category = tabId.toLowerCase();
  if (cursor) params.cursor = cursor;
  params.limit = 20;

  const { data } = await API.get("/candidate/get-all-notifications", {
    params,
  });

  // The backend returns a wrapped payload like { statusCode, data, message }.
  // Support both wrapped and direct responses so the UI works with either format.
  return data?.data ?? data;
}

export async function deleteNotification(userNotificationId) {
  if (!userNotificationId) {
    throw new Error("Notification id is required.");
  }

  const { data } = await API.delete(
    `/user/deleteNotifs/${encodeURIComponent(userNotificationId)}`,
  );

  return data?.data ?? data;
}