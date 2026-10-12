import {
  BadgeCheck,
  Bell,
  Briefcase,
  Calendar,
  FileText,
  Star,
  UserCheck,
} from "lucide-react";
import API from "../api.js";

// ⚠️ PLACEHOLDER TYPES — I don't have your admin notification_type enum
// values. These are guesses based on what an admin would plausibly get
// notified about (new enquiries, approval requests, candidate/course
// activity). Replace the keys on the left with your real backend enum
// values once confirmed.
const TYPE_CONFIG = {
  ENQUIRY: { type: "enquiry", icon: FileText },
  NEW_ENQUIRY: { type: "enquiry", icon: FileText },
  APPROVAL_REQUEST: { type: "approval", icon: UserCheck },
  CANDIDATE_UPDATE: { type: "candidate", icon: Star },
  COURSE_UPDATE: { type: "course", icon: Briefcase },
  EVENT: { type: "event", icon: Calendar },
  ACCOUNT_APPROVED: { type: "approved", icon: BadgeCheck },
};

const CATEGORY_LABELS = {
  enquiry: "ENQUIRY",
  approval: "APPROVAL REQUEST",
  candidate: "CANDIDATE",
  course: "COURSE UPDATE",
  event: "EVENT",
  approved: "ACCOUNT",
  update: "UPDATE",
};

const formatRelativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)} hour${seconds >= 7200 ? "s" : ""} ago`;
  return `${Math.floor(seconds / 86400)} day${seconds >= 172800 ? "s" : ""} ago`;
};

/** Pill/icon colors per normalized type — keyed to the lowercase type
 * strings normalizeAdminNotification produces below, mirroring the
 * recruiter service's pattern. */
export const notificationTypeStyles = {
  enquiry: { bg: "#eff6ff", color: "#3b82f6" },
  approval: { bg: "#fef2f2", color: "#ef4444" },
  candidate: { bg: "#f0fdf4", color: "#22c55e" },
  course: { bg: "#eff6ff", color: "#3b82f6" },
  event: { bg: "#fffbeb", color: "#d97706" },
  approved: { bg: "#f0fdf4", color: "#22c55e" },
  update: { bg: "#f3f4f6", color: "#6b7280" },
};

/** Category labels shown in NotificationDetailsModal — this is the piece
 * that was missing entirely from the recruiter service (it was still
 * being read from an old mock `data/` file there). Defined properly
 * here instead of repeating that gap. */
export const notificationCategoryLabels = CATEGORY_LABELS;

export function normalizeAdminNotification(notification = {}) {
  const detail = notification.notifications ?? {};
  const notificationType = String(detail.notification_type ?? "").toUpperCase();
  const config = TYPE_CONFIG[notificationType] ?? {
    type: "update",
    icon: Bell,
  };

  return {
    id: notification.user_notification_id ?? detail.notification_id,
    type: config.type,
    icon: config.icon,
    title: detail.title ?? "Notification",
    description: detail.notification_message ?? "",
    time: formatRelativeTime(notification.created_at ?? detail.created_at),
    unread: !notification.is_read,
  };
}

/**
 * -> fetchAdminNotifications (GET /admin/notifications)
 * ⚠️ PLACEHOLDER PATH — mirrors the recruiter route's shape
 * (GET /hr/notifications) but I have no confirmed admin route or
 * controller for this yet. Confirm before relying on it.
 */
export async function fetchAdminNotifications(params = {}) {
  const response = await API.get("/admin/notifications", {
    params: { page: 1, limit: 10, ...params },
  });
  const payload = response.data?.data ?? {};
  const notifications = Array.isArray(payload.notifications)
    ? payload.notifications
    : [];

  return {
    notifications: notifications.map(normalizeAdminNotification),
    pagination: payload.pagination ?? {},
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