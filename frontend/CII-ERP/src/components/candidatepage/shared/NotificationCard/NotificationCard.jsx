import Icon from '../Icon/Icon';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './NotificationCard.module.css';

/**
 * NotificationCard
 *
 * Props:
 * - id
 * - title
 * - description  (optional secondary line)
 * - category
 * - time         (pre-formatted display string, e.g. "1h ago")
 * - icon         -> icon name passed to the shared <Icon /> component
 * - color        -> 'blue' | 'green' | 'yellow' | 'red' | 'gray'
 * - isUnread
 * - onSelect     -> (id) => void, called on click / Enter (e.g. mark as read)
 *
 * NOTE ON ASSUMPTIONS: this assumes the existing <Icon /> component accepts
 * a `name` + `size` prop, and the existing <StatusBadge /> component accepts
 * `label` + `variant` props. If your actual components use different prop
 * names, only the two lines below need to change.
 */
function NotificationCard({
  id,
  title,
  description,
  category,
  time,
  icon,
  color = 'gray',
  isUnread,
  onSelect,
  onDelete,
}) {
  const handleKeyDown = (event) => {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    }
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    onDelete?.(id);
  };

  return (
    <div
      className={`${styles.card} ${isUnread ? styles.unread : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${title}${isUnread ? ', unread' : ''}`}
      onClick={() => onSelect?.(id)}
      onKeyDown={handleKeyDown}
    >
      {isUnread && <span className={styles.dot} aria-hidden="true" />}

      <div className={`${styles.iconWrap} ${styles[`icon-${color}`] || styles['icon-gray']}`}>
        <Icon name={icon} size={18} />
      </div>

      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {description && <p className={styles.description}>{description}</p>}

        <div className={styles.meta}>
          <StatusBadge label={category} variant={color} />
          <span className={styles.time}>{time}</span>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`Delete ${title}`}
          onClick={handleDeleteClick}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

export default NotificationCard;
