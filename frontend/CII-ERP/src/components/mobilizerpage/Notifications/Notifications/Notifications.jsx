import React, { useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  fetchMobilizerNotifications,
} from "../../../../../api/mobilizer/notificationService";
import NotificationRow from "../../shared/NotificationRow/NotificationRow";
import NotificationDetailModal from "../../shared/NotificationDetailModal/NotificationDetailModal";
import "./Notifications.css";

const PAGE_SIZE = 6;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("All");
  const [page, setPage] = useState(1);
  const [activeNotification, setActiveNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState("");

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const { notifications: items } = await fetchMobilizerNotifications({
          limit: PAGE_SIZE,
          unreadOnly: activeTab === "Unread",
        });

        setNotifications(items);
        setUnreadCount(items.filter((item) => !item.read).length);
      } catch (error) {
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [activeTab]);

  const filtered = useMemo(() => {
    if (activeTab === "Unread") {
      return notifications.filter((notification) => !notification.read);
    }

    return notifications;
  }, [activeTab, notifications]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleRowClick = (notification) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - (notification.read ? 0 : 1)));
    setActiveNotification({ ...notification, read: true });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  const handleDeleteNotification = async (notification) => {
    if (!notification) return;

    const notificationId =
      notification.id ?? notification.user_notification_id ?? notification.notification_id;
    if (!notificationId) return;

    const isEventNotification =
      String(notification.type ?? "").toUpperCase().includes("EVENT") ||
      String(notification.notification_type ?? "").toUpperCase().includes("EVENT") ||
      String(notification.reference_type ?? "").toUpperCase().includes("EVENT");

    if (isEventNotification) {
      setDeleteSuccessMessage("");
      setDeleteMessage("Event notifications cannot be deleted.");
      setActiveNotification(notification);
      return;
    }

    try {
      setDeleteMessage("");
      setDeleteSuccessMessage("");
      const result = await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((item) => (item.id ?? item.user_notification_id ?? item.notification_id) !== notificationId),
      );
      setUnreadCount((count) => Math.max(0, count - (notification.read ? 0 : 1)));
      setDeleteSuccessMessage(
        result?.message ?? "Notification deleted successfully",
      );
      setActiveNotification(null);
    } catch (error) {
      setDeleteMessage(
        error?.response?.data?.message ?? "Couldn't delete this notification.",
      );
      setActiveNotification(notification);
    }
  };

  return (
    <div className="notifications-page">
      <div className="nt-header">
        <div>
          <h1 className="nt-header__title">Notifications</h1>
          <p className="nt-header__subtitle">
            Updates on enquiries, placements, events, and tasks
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="nt-mark-all-btn"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {deleteSuccessMessage && (
        <p className="nt-delete-success" role="status">
          {deleteSuccessMessage}
        </p>
      )}

      <div className="nt-tabs">
        {["All", "Unread"].map((tab) => (
          <button
            type="button"
            key={tab}
            className={`nt-tab ${tab === activeTab ? "nt-tab--active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab === "Unread"
              ? `Unread (${unreadCount})`
              : `All (${notifications.length})`}
          </button>
        ))}
      </div>

      <div className="nt-list-card">
        {loading ? (
          <div className="nt-empty">Loading notifications...</div>
        ) : pageItems.length === 0 ? (
          <div className="nt-empty">
            You&apos;re all caught up — no notifications here.
          </div>
        ) : (
          pageItems.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onClick={handleRowClick}
              onDelete={handleDeleteNotification}
            />
          ))
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="nt-pagination">
          <button
            type="button"
            className="nt-pagination__btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            &lt;
          </button>

          <span className="nt-pagination__label">
            Page {safePage} of {totalPages}
          </span>

          <button
            type="button"
            className="nt-pagination__btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}

      <NotificationDetailModal
        notification={activeNotification}
        onClose={() => {
          setActiveNotification(null);
          setDeleteMessage("");
        }}
        onDelete={handleDeleteNotification}
        deleteMessage={deleteMessage}
      />
    </div>
  );
}
