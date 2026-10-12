import { ClipboardList, CalendarClock, PlusCircle, Bell } from "lucide-react";
import API from "../api.js";

/**
 * Maps each real notification_type to a category (matching
 * NotificationTabs' task/resources/system pills) and an icon key
 * (matching NOTIFICATION_ICONS in NotificationList.jsx).
 *
 * JUDGMENT CALL, not confirmed spec — the original mock's "Task"
 * category (New task assigned / task overdue) has no backend
 * equivalent in notification_type at all, so nothing will ever land
 * in "task" from real data unless the backend adds a type for it
 * later. ASSESSMENT_CREATED/EXAMINATION/BATCH_ASSIGNED/ACADEMIC are
 * grouped under "task" as the closest fit, but confirm/adjust if you
 * want different groupings.
 */
const TYPE_CONFIG = {
  ASSESSMENT_CREATED: { category: "task", icon: "clipboard" },
  EXAMINATION: { category: "task", icon: "clipboard" },
  BATCH_ASSIGNED: { category: "task", icon: "clipboard" },
  ACADEMIC: { category: "task", icon: "clipboard" },

  STUDY_MATERIAL_UPLOADED: { category: "resources", icon: "plus" },
  CERTIFICATE_UPLOADED: { category: "resources", icon: "plus" },
  RESULT_PUBLISHED: { category: "resources", icon: "plus" },

  ATTENDANCE_CREATED: { category: "system", icon: "calendar" },
  EVENT_CREATED: { category: "system", icon: "calendar" },
  EVENT_UPDATED: { category: "system", icon: "calendar" },
  EVENT_DELETED: { category: "system", icon: "calendar" },
  GENERAL: { category: "system", icon: "bell" },

  // HR/candidate-side types — unlikely for an instructor, included
  // defensively so nothing breaks if one ever does arrive.
  JOB_EVENT_CREATED: { category: "system", icon: "calendar" },
  JOB_EVENT_UPDATED: { category: "system", icon: "calendar" },
  JOB_EVENT_DELETED: { category: "system", icon: "calendar" },
  JOB_OPPORTUNITY: { category: "system", icon: "bell" },
  JOB_OPPURTUNITY: { category: "system", icon: "bell" },
  RECRUITER_RESPONSE: { category: "system", icon: "bell" },
  INTERVIEW_SCHEDULED: { category: "system", icon: "calendar" },
};

const DEFAULT_CONFIG = { category: "system", icon: "bell" };

function timeAgo(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Transforms one raw row from GET /instructor/notifications into the
 * shape NotificationList/NotificationTabs expect.
 */
export function normalizeInstructorNotification(raw = {}) {
  const detail = raw.notifications ?? {};
  const type = String(detail.notification_type ?? "GENERAL").toUpperCase();
  const config = TYPE_CONFIG[type] ?? DEFAULT_CONFIG;

  const relative = timeAgo(raw.created_at ?? detail.created_at);
  const meta = detail.notification_message
    ? `${detail.notification_message} · ${relative}`
    : relative;

  return {
    id: raw.user_notification_id,
    notificationId: detail.notification_id ?? raw.user_notification_id,
    title: detail.title ?? "Notification",
    meta,
    message: detail.notification_message ?? "",
    notificationType: type,
    referenceType: detail.reference_type ?? "",
    referenceId: detail.reference_id ?? "",
    icon: config.icon,
    category: config.category,
    unread: !raw.is_read,
    createdAt: raw.created_at ?? detail.created_at,
  };
}

/**
 * Fetches ALL instructor notifications — this endpoint has no
 * pagination (unlike the HR /notifications route), so it returns the
 * full list in one call. Filtering by tab stays client-side, same as
 * the original mock-data version.
 */
export async function fetchInstructorNotifications() {
  const res = await API.get("/instructor/notifications");
  const raw = res.data?.data?.notifications ?? [];
  return raw.map(normalizeInstructorNotification);
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
