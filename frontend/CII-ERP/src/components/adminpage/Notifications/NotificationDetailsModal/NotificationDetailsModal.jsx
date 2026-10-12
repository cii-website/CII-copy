import React from "react";
import { X } from "lucide-react";
import Modal from "../../shared/Modal/Modal";
import {
  notificationTypeStyles,
  notificationCategoryLabels,
} from "../../../../../api/admin/notificationService";
import "./NotificationDetailsModal.css";

const NotificationDetailsModal = ({
  notification,
  isOpen,
  onClose,
  onDelete,
  deleteMessage,
}) => {
  if (!notification) return null;

  const Icon = notification.icon;
  const style = notificationTypeStyles[notification.type] ?? {};
  const category = notificationCategoryLabels[notification.type] ?? "UPDATE";

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={480}>
      <div className="notification-details-modal">
        <button
          type="button"
          className="notification-details-modal__close"
          onClick={onClose}
          aria-label="Close notification details"
        >
          <X size={18} />
        </button>
        <span
          className="notification-details-modal__icon"
          style={{ backgroundColor: style.bg }}
        >
          <Icon size={22} color={style.color} strokeWidth={2} />
        </span>

        <span className="notification-details-modal__category">{category}</span>
        <h2 className="notification-details-modal__title">
          {notification.title}
        </h2>
        <p className="notification-details-modal__description">
          {notification.description}
        </p>
        <div className="notification-details-modal__actions">
          <button
            type="button"
            className="notification-details-modal__delete-btn"
            onClick={() => onDelete?.(notification.id)}
          >
            Delete
          </button>
          <button
            type="button"
            className="notification-details-modal__close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {deleteMessage && (
          <p className="notification-details-modal__delete-message">
            {deleteMessage}
          </p>
        )}
        <span className="notification-details-modal__time">
          {notification.time}
        </span>
      </div>
    </Modal>
  );
};

export default NotificationDetailsModal;
