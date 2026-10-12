import React from 'react';
import { UserPlus, Briefcase, CalendarDays, CheckSquare, Bell } from 'lucide-react';
import './NotificationRow.css';

const TYPE_MAP = {
  enquiry: { icon: UserPlus, tone: 'blue' },
  placement: { icon: Briefcase, tone: 'navy' },
  event: { icon: CalendarDays, tone: 'purple' },
  task: { icon: CheckSquare, tone: 'teal' },
  system: { icon: Bell, tone: 'orange' },
};

/**
 * NotificationRow
 * Props:
 *  - notification: { id, type, title, message, timestamp, read }
 *  - compact: boolean — smaller padding + truncated message, for the
 *      bell dropdown. Full size (default) is for the Notifications page.
 *  - onClick: (notification) => void
 */
export default function NotificationRow({ notification, compact = false, onClick, onDelete }) {
  const meta = TYPE_MAP[notification.type] || TYPE_MAP.system;
  const Icon = meta.icon;

  return (
    <div className="nr-row-wrap">
      <button
        type="button"
        className={`nr-row ${compact ? 'nr-row--compact' : ''} ${!notification.read ? 'nr-row--unread' : ''}`}
        onClick={() => onClick?.(notification)}
      >
        <span className={`nr-row__icon nr-row__icon--${meta.tone}`}>
          <Icon size={compact ? 15 : 17} />
        </span>

        <span className="nr-row__body">
          <span className="nr-row__top">
            <span className="nr-row__title">{notification.title}</span>
            {!notification.read && <span className="nr-row__dot" />}
          </span>
          <span className={`nr-row__message ${compact ? 'nr-row__message--clamp' : ''}`}>
            {notification.message}
          </span>
          <span className="nr-row__timestamp">{notification.timestamp}</span>
        </span>
      </button>

      {onDelete && (
        <button
          type="button"
          className="nr-row__delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(notification);
          }}
        >
          Delete
        </button>
      )}
    </div>
  );
}
