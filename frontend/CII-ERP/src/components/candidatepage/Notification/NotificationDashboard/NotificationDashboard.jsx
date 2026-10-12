import { useCallback, useEffect, useMemo, useState } from "react";

import Sidebar from "../../layout/Sidebar/Sidebar";
import Topbar from "../../layout/Topbar/Topbar";
import SectionHeading from "../../shared/SectionHeading/SectionHeading";
import NotificationCard from "../../shared/NotificationCard/NotificationCard";
import Icon from "../../shared/Icon/Icon";

import {
  fetchNotifications,
  deleteNotification,
} from "../../../../services/Notificationservice";
import styles from "./NotificationDashboard.module.css";

import orgLogo from "../../../../assets/Logo.png";

const NOTIFICATION_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "UNREAD", label: "Unread" },
  { id: "TASK", label: "Task" },
  { id: "RESOURCES", label: "Resources" },
];

function formatRelativeTime(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Date(isoDate).toLocaleDateString("en-IN", {
    weekday: diffHours < 24 * 7 ? "long" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

// Backend shape -> what NotificationCard renders.
function mapNotification(raw) {
  const categoryByReferenceType = {
    JOB: "Job",
    INTERVIEW: "Job",
    EXAM: "Examination",
    EXAMINATION: "Examination",
    ASSESSMENT: "Academics",
    STUDY_MATERIAL: "Academics",
    EVENT: "Events",
  };
  return {
    id: raw.user_notification_id,
    title: raw.title,
    description: raw.message,
    category: categoryByReferenceType[raw.reference_type] ?? "System",
    icon: "bell",
    color: "gray",
    referenceType: raw.reference_type, // used for the reference-type filter
    // is_read here is the value captured BEFORE the backend's GET-marks-read
    // side effect — i.e. "was this unread when the user opened this page".
    isUnread: !raw.is_read,
    createdAt: raw.created_at,
  };
}

function matchesFilter(notification, filter) {
  if (filter === "ALL") return true;
  if (filter === "UNREAD") return notification.isUnread;
  if (filter === "TASK") {
    return ["ASSESSMENT", "EXAM", "EXAMINATION"].includes(
      notification.referenceType,
    );
  }
  if (filter === "RESOURCES") {
    return ["JOB", "INTERVIEW", "STUDY_MATERIAL", "EVENT"].includes(
      notification.referenceType,
    );
  }
  return true;
}

function NotificationDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notificationFilter, setNotificationFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");

  // The category tabs (All/Job/Examination/Academics/Events) were removed
  // from the UI, but fetchNotifications still takes a category param.
  // We just always fetch the unfiltered "All" category now; filtering by
  // reference type happens client-side below, same as before.
  const activeTab = "All";

  const [buckets, setBuckets] = useState({
    today: [],
    yesterday: [],
    older: [],
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    nextCursor: null,
    hasNextPage: false,
  });
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState(null);

  const loadPage = useCallback(async (tabId, cursor, { append } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications(tabId, cursor);
      const mapped = {
        today: data.notifications.today.map(mapNotification),
        yesterday: data.notifications.yesterday.map(mapNotification),
        older: data.notifications.older.map(mapNotification),
      };

      setBuckets((prev) =>
        append
          ? {
              today: [...prev.today, ...mapped.today],
              yesterday: [...prev.yesterday, ...mapped.yesterday],
              older: [...prev.older, ...mapped.older],
            }
          : mapped,
      );
      setUnreadCount(data.unreadCount);
      setPagination(data.pagination);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch (fresh, not appended) whenever the tab changes.
  useEffect(() => {
    loadPage(activeTab, undefined, { append: false });
  }, [activeTab, loadPage]);

  const handleLoadMore = () => {
    if (pagination.hasNextPage && !loading) {
      loadPage(activeTab, pagination.nextCursor, { append: true });
    }
  };

  const allLoaded = useMemo(
    () => [...buckets.today, ...buckets.yesterday, ...buckets.older],
    [buckets],
  );

  // Filters are applied client-side to the loaded notification pages.
  const filteredBuckets = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    const matches = (n) => {
      const matchesQuery =
        !query ||
        n.title.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query);

      const matchesReferenceType = matchesFilter(n, notificationFilter);

      return matchesQuery && matchesReferenceType;
    };

    const sortNotifications = (items) =>
      [...items].sort((first, second) => {
        if (sortBy === "unread") {
          return (
            Number(second.isUnread) - Number(first.isUnread) ||
            new Date(second.createdAt) - new Date(first.createdAt)
          );
        }
        const difference =
          new Date(second.createdAt) - new Date(first.createdAt);
        return sortBy === "oldest" ? -difference : difference;
      });

    return {
      today: sortNotifications(buckets.today.filter(matches)),
      yesterday: sortNotifications(buckets.yesterday.filter(matches)),
      older: sortNotifications(buckets.older.filter(matches)),
    };
  }, [buckets, searchValue, notificationFilter, sortBy]);

  const groupedNotifications = useMemo(
    () =>
      [
        ["TODAY", filteredBuckets.today],
        ["YESTERDAY", filteredBuckets.yesterday],
        ["OLDER", filteredBuckets.older],
      ].filter(([, items]) => items.length > 0),
    [filteredBuckets],
  );

  // Counts per reference type, computed from whatever's currently loaded
  // (allLoaded). NOTE: this is a client-side count of loaded pages only —
  // not a true global total. If the user hasn't paged through everything,
  // these numbers only reflect what's been fetched so far. A dedicated
  // counts endpoint would be needed for accurate totals across all pages.
  const notificationFilterTabs = useMemo(
    () =>
      NOTIFICATION_FILTERS.map(({ id, label }) => ({
        id,
        label,
        count:
          id === "ALL"
            ? allLoaded.length
            : allLoaded.filter((notification) =>
                matchesFilter(notification, id),
              ).length,
      })),
    [allLoaded],
  );

  const handleNotificationClick = (id) => {
    setSelectedNotification(allLoaded.find((item) => item.id === id) ?? null);
  };

  const handleDeleteNotification = async (id) => {
    const notification = allLoaded.find((item) => item.id === id);
    if (!notification) return;

    if (notification.referenceType === "EVENT") {
      setDeleteSuccessMessage(null);
      setDeleteMessage("Event notifications cannot be deleted.");
      setSelectedNotification(notification);
      return;
    }

    setDeleteMessage(null);
    setDeleteSuccessMessage(null);

    try {
      const result = await deleteNotification(id);
      setBuckets((prev) => ({
        today: prev.today.filter((item) => item.id !== id),
        yesterday: prev.yesterday.filter((item) => item.id !== id),
        older: prev.older.filter((item) => item.id !== id),
      }));
      setUnreadCount((count) => Math.max(0, count - (notification.isUnread ? 1 : 0)));
      setDeleteSuccessMessage(
        result?.message ?? "Notification deleted successfully",
      );
      if (selectedNotification?.id === id) {
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
    <div className={styles.layout}>
      <Sidebar
        orgLogoSrc={orgLogo}
        activeItem="Notifications"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={styles.content}>
        <Topbar
          search={searchValue}
          onSearch={setSearchValue}
          userInitials="AS"
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />

        <main className={styles.main}>
          <SectionHeading
            title="Notification"
            subtitle={`${unreadCount} Unread · Stay On Top of Deadlines, Classes, and Updates`}
          />
          {deleteSuccessMessage && (
            <p className={styles.deleteSuccessMessage} role="status">
              {deleteSuccessMessage}
            </p>
          )}

          <div className={styles.filterPanel}>
            <div
              className={styles.filterTabs}
              role="tablist"
              aria-label="Notification filters"
            >
              {notificationFilterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={notificationFilter === tab.id}
                  className={`${styles.filterTab} ${notificationFilter === tab.id ? styles.filterTabActive : ""}`}
                  onClick={() => setNotificationFilter(tab.id)}
                >
                  {tab.label}
                  {tab.id !== "ALL" && (
                    <span className={styles.filterCount}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className={styles.sortFilter}
              aria-label="Sort notifications"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="unread">Unread first</option>
            </select>
          </div>

          {selectedNotification && (
            <div
              className={styles.notificationDetailsOverlay}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget)
                  setSelectedNotification(null);
              }}
            >
              <section
                className={styles.notificationDetails}
                aria-label="Notification details"
                role="dialog"
                aria-modal="true"
              >
                <div className={styles.detailIcon}>
                  <Icon name="bell" size={28} color="#ffffff" />
                </div>
                <span className={styles.detailCategory}>
                  {selectedNotification.category}
                </span>
                <div className={styles.detailHeaderActions}>
                  <button
                    type="button"
                    className={styles.deleteDetails}
                    onClick={() => handleDeleteNotification(selectedNotification.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className={styles.closeDetails}
                    onClick={() => setSelectedNotification(null)}
                  >
                    Close
                  </button>
                </div>
                <h2>{selectedNotification.title}</h2>
                {deleteMessage && (
                  <p className={styles.deleteNotice}>{deleteMessage}</p>
                )}
                <p>{selectedNotification.description}</p>
                <time dateTime={selectedNotification.createdAt}>
                  {new Date(selectedNotification.createdAt).toLocaleString(
                    "en-IN",
                  )}
                </time>
              </section>
            </div>
          )}

          <section
            className={styles.notificationColumn}
            aria-label="Notification list"
          >
            {error && <p className={styles.emptyState}>{error}</p>}

            {!error && groupedNotifications.length === 0 && !loading && (
              <p className={styles.emptyState}>
                No notifications match your filters.
              </p>
            )}

            {groupedNotifications.map(([groupLabel, items]) => (
              <div key={groupLabel} className={styles.group}>
                <h2 className={styles.groupLabel}>{groupLabel}</h2>
                <div className={styles.cardList}>
                  {items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      id={notification.id}
                      title={notification.title}
                      description={notification.description}
                      category={notification.category}
                      color={notification.color}
                      icon={notification.icon}
                      isUnread={notification.isUnread}
                      time={formatRelativeTime(notification.createdAt)}
                      onSelect={handleNotificationClick}
                      onDelete={handleDeleteNotification}
                    />
                  ))}
                </div>
              </div>
            ))}

            {pagination.hasNextPage && (
              <button
                type="button"
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default NotificationDashboard;
