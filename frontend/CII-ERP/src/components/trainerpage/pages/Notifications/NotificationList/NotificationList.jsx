import { ClipboardList, CalendarClock, PlusCircle, Bell } from "lucide-react";
import { SectionCard } from "../../../shared";
import "./NotificationList.css";

// icon key -> lucide component (mirrors the STAT_ICONS/ACTIVITY_ICONS
// lookup pattern already used in TaskAssigned/RecentActivity)
const NOTIFICATION_ICONS = {
  clipboard: ClipboardList,
  calendar: CalendarClock,
  plus: PlusCircle,
};

// notification category -> icon badge tone
const CATEGORY_TONE = {
  task: "navy",
  resources: "blue",
  system: "blue",
};

/**
 * NotificationList
 *
 * "Recent Notifications" panel: icon badge + bold title + grey meta
 * line per row, with a light-blue full-row highlight on unread items.
 * Wrapped in the reusable <SectionCard> from /shared for the white
 * card + underlined heading (no "View all" action here, unlike
 * RecentActivity on the Work page).
 */
export default function NotificationList({ notifications = [], onSelect, onDelete }) {
  return (
    <SectionCard title="Recent Notifications" className="notification-list">
      <ul className="notification-list__list">
        {notifications.map((item) => {
          const Icon = NOTIFICATION_ICONS[item.icon] || Bell;
          const tone = CATEGORY_TONE[item.category] || "navy";
          return (
            <li
              key={item.id}
              className={`notification-list__item${
                item.unread ? " notification-list__item--unread" : ""
              }`}
            >
              <div
                className="notification-list__row"
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect?.(item);
                  }
                }}
              >
                <div
                  className={`notification-list__icon notification-list__icon--${tone}`}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div className="notification-list__content">
                  <p className="notification-list__title">{item.title}</p>
                  <p className="notification-list__meta">{item.meta}</p>
                </div>
              </div>

              {onDelete && (
                <button
                  type="button"
                  className="notification-list__delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(item);
                  }}
                  aria-label={`Delete notification ${item.title}`}
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}

        {notifications.length === 0 && (
          <li className="notification-list__empty">
            No notifications in this category.
          </li>
        )}
      </ul>
    </SectionCard>
  );
}
