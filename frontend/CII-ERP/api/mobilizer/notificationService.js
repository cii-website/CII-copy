import API from "../api.js";

const TYPE_MAP = {
  JOB_EVENT_CREATED: "placement",
  JOB_EVENT_UPDATED: "placement",
  JOB_EVENT_CANCELLED: "placement",
  JOB_EVENT_REMINDER: "event",
  JOB_DRIVE_CREATED: "placement",
  JOB_DRIVE_UPDATED: "placement",
  ENQUIRY_CREATED: "enquiry",
  ENQUIRY_UPDATED: "enquiry",
  CANDIDATE_ENQUIRY: "enquiry",
  TASK_ASSIGNED: "task",
  TASK_REMINDER: "task",
  SYSTEM: "system",
};

function normalizeNotificationType(type) {
  const value = String(type || "").toUpperCase();

  if (TYPE_MAP[value]) return TYPE_MAP[value];
  if (value.includes("ENQUIRY") || value.includes("CANDIDATE")) return "enquiry";
  if (value.includes("TASK")) return "task";
  if (value.includes("EVENT") || value.includes("WEBINAR") || value.includes("SEMINAR")) return "event";
  if (value.includes("JOB") || value.includes("PLACEMENT")) return "placement";
  if (value.includes("SYSTEM") || value.includes("REPORT")) return "system";

  return "system";
}

function formatRelativeTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes <= 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeNotification(notification = {}) {
  return {
    id: notification.user_notification_id ?? notification.notification_id,
    user_notification_id: notification.user_notification_id,
    notification_id: notification.notification_id,
    type: normalizeNotificationType(notification.notification_type),
    title: notification.title || "Notification",
    message: notification.message || notification.notification_message || "",
    timestamp: formatRelativeTime(notification.created_at),
    createdAt: notification.created_at,
    read: Boolean(notification.is_read),
    is_read: Boolean(notification.is_read),
    reference_type: notification.reference_type,
    reference_id: notification.reference_id,
    notification_type: notification.notification_type,
  };
}

export async function fetchMobilizerNotifications({ limit = 20, cursor, unreadOnly = false } = {}) {
  const params = { limit };

  if (cursor) params.cursor = cursor;
  if (unreadOnly) params.unreadOnly = true;

  const response = await API.get("/mobilizer/notifications", { params });
  const data = response.data?.data ?? response.data ?? {};
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];

  return {
    notifications: notifications.map(normalizeNotification),
    pagination: {
      nextCursor: data?.pagination?.nextCursor ?? null,
      hasNextPage: Boolean(data?.pagination?.hasNextPage),
      limit: Number(data?.pagination?.limit ?? limit),
    },
  };
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
