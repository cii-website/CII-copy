import { Bell, CalendarDays, X } from "lucide-react";
import "./NotificationDetailModal.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationDetailModal({
  notification,
  onClose,
  onDelete,
  deleteMessage,
}) {
  if (!notification) return null;

  return (
    <div
      className="notification-detail-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="notification-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Notification details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="notification-detail-modal__header">
          <div className="notification-detail-modal__heading">
            <span className="notification-detail-modal__icon">
              <Bell size={17} />
            </span>
            <div>
              <p>Notification details</p>
              <h2>{notification.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="notification-detail-modal__message">
          {notification.message || notification.meta || "-"}
        </div>

        <div className="notification-detail-modal__actions">
          <button
            type="button"
            className="notification-detail-modal__delete-btn"
            onClick={() => onDelete?.(notification)}
          >
            Delete
          </button>
          <button
            type="button"
            className="notification-detail-modal__close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {deleteMessage && (
          <p className="notification-detail-modal__delete-message">
            {deleteMessage}
          </p>
        )}

        <dl className="notification-detail-modal__details">
          <div>
            <dt>
              <CalendarDays size={14} /> Date
            </dt>
            <dd>{formatDate(notification.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
