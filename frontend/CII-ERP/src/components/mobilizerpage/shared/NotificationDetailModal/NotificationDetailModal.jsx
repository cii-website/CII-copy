import React from 'react';
import { X, UserPlus, Briefcase, CalendarDays, CheckSquare, Bell } from 'lucide-react';
import Modal from '../Modal/Modal';
import './NotificationDetailModal.css';

const TYPE_MAP = {
  enquiry: { icon: UserPlus, tone: 'blue', label: 'Enquiry' },
  placement: { icon: Briefcase, tone: 'navy', label: 'Placement' },
  event: { icon: CalendarDays, tone: 'purple', label: 'Event' },
  task: { icon: CheckSquare, tone: 'teal', label: 'Task' },
  system: { icon: Bell, tone: 'orange', label: 'System' },
};

/**
 * NotificationDetailModal
 * Props:
 *  - notification: notification object, or null when closed
 *  - onClose: () => void
 */
export default function NotificationDetailModal({
  notification,
  onClose,
  onDelete,
  deleteMessage,
}) {
  const isOpen = Boolean(notification);
  const meta = notification ? TYPE_MAP[notification.type] || TYPE_MAP.system : null;
  const Icon = meta?.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} width={440}>
      {notification && (
        <div className="nd-modal">
          <button type="button" className="nd-modal__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>

          <span className={`nd-modal__icon nd-modal__icon--${meta.tone}`}>
            <Icon size={20} />
          </span>

          <span className="nd-modal__type">{meta.label}</span>
          <h2 className="nd-modal__title">{notification.title}</h2>
          <p className="nd-modal__message">{notification.message}</p>
          <div className="nd-modal__actions">
            <button
              type="button"
              className="nd-modal__delete-btn"
              onClick={() => onDelete?.(notification)}
            >
              Delete
            </button>
            <button
              type="button"
              className="nd-modal__close-btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          {deleteMessage && <p className="nd-modal__delete-message">{deleteMessage}</p>}
          <p className="nd-modal__timestamp">{notification.timestamp}</p>
        </div>
      )}
    </Modal>
  );
}
