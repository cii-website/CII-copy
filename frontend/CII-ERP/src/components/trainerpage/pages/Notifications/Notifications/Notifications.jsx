import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../../layout/Sidebar/Sidebar";
import Topbar from "../../../layout/Topbar/Topbar";
import { Button } from "../../../shared";
import NotificationTabs from "../NotificationTabs/NotificationTabs";
import NotificationList from "../NotificationList/NotificationList";
import NotificationDetailModal from "../NotificationDetailModal/NotificationDetailModal";
import {
  deleteNotification,
  fetchInstructorNotifications,
} from "../../../../../../api/trainer/notificationService";
import "../../../styles/variables.css";
import "./Notifications.css";

const TAB_LABELS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

/**
 * Notifications (full page)
 *
 * Now fetches from GET /instructor/notifications instead of mock
 * data/notificationsData.js. "Mark all as read" has no backend
 * endpoint yet — it's local-only (flips `unread` in this component's
 * state, doesn't persist, will revert on next fetch/reload).
 */
const Notifications = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInstructorNotifications()
      .then((data) => !cancelled && setNotifications(data))
      .catch((err) => {
        console.error("Failed to load notifications:", err);
        if (!cancelled) setError("Unable to load notifications right now.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const tabsWithCounts = useMemo(
    () =>
      TAB_LABELS.map((tab) => {
        if (tab.id === "all") return { ...tab, count: notifications.length };
        if (tab.id === "unread") return { ...tab, count: unreadCount };
        return {
          ...tab,
          count: notifications.filter((n) => n.category === tab.id).length,
        };
      }),
    [notifications, unreadCount],
  );

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.category === activeTab);
  }, [activeTab, notifications]);

  const handleMarkAllRead = () => {
    // No backend endpoint for this yet — local-only, reverts on next
    // fetch/reload. Same deliberate stopgap used on the recruiter side.
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleDeleteNotification = async (notification) => {
    if (!notification) return;

    const notificationId =
      notification.id ??
      notification.user_notification_id ??
      notification.notificationId;
    if (!notificationId) return;

    const isEventNotification =
      String(notification.notificationType ?? "")
        .toUpperCase()
        .includes("EVENT") ||
      String(notification.referenceType ?? "")
        .toUpperCase()
        .includes("EVENT") ||
      String(notification.category ?? "")
        .toLowerCase()
        .includes("event");

    if (isEventNotification) {
      setDeleteSuccessMessage("");
      setDeleteMessage("Event notifications cannot be deleted.");
      setSelectedNotification(notification);
      return;
    }

    try {
      setDeleteMessage("");
      setDeleteSuccessMessage("");
      const result = await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter(
          (item) =>
            (item.id ?? item.user_notification_id ?? item.notificationId) !==
            notificationId,
        ),
      );
      setDeleteSuccessMessage(
        result?.message ?? "Notification deleted successfully",
      );
      if (
        selectedNotification &&
        ((selectedNotification.id ??
          selectedNotification.user_notification_id ??
          selectedNotification.notificationId) === notificationId)
      ) {
        setSelectedNotification(null);
      }
    } catch (err) {
      setDeleteMessage(
        err?.response?.data?.message ?? "Couldn't delete this notification.",
      );
      setSelectedNotification(notification);
    }
  };

  return (
    <div className="staff-dashboard">
      <Topbar
        user={{ name: "Staff Admin" }}
        hasUnreadNotifications={unreadCount > 0}
        onMenuToggle={() => setSidebarOpen((o) => !o)}
      />

      <div className="staff-dashboard__content">
        <Sidebar />

        <div className="staff-dashboard__main">
          <main className="staff-dashboard__body">
            <div className="notifications-page">
              <div className="notifications-page__header">
                <div>
                  <h1 className="notifications-page__title">Notification</h1>
                  <p className="notifications-page__subtitle">
                    you have {unreadCount} unread notification
                    {unreadCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="outline" onClick={handleMarkAllRead}>
                  Mark all as read
                </Button>
              </div>

              {deleteSuccessMessage && (
                <p className="notifications-page__delete-success" role="status">
                  {deleteSuccessMessage}
                </p>
              )}

              <div className="notifications-page__tabs-card">
                <NotificationTabs
                  tabs={tabsWithCounts}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              {error && <p className="notifications-page__error">{error}</p>}
              {loading && !error && (
                <p className="notifications-page__loading">
                  Loading notifications...
                </p>
              )}
              {!loading && !error && (
                <NotificationList
                  notifications={filteredNotifications}
                  onSelect={setSelectedNotification}
                  onDelete={handleDeleteNotification}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={() => {
          setSelectedNotification(null);
          setDeleteMessage("");
        }}
        onDelete={handleDeleteNotification}
        deleteMessage={deleteMessage}
      />
    </div>
  );
};

export default Notifications;
