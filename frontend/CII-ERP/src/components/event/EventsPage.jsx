import React, { useEffect, useMemo, useState } from "react";
import Header from "../homepage/header/Header";
import Navbar from "../homepage/navbar/Navbar";
import Footer from "../homepage/footer/Footer";
import {
  getPublicEvents,
  getPublicJobEvents,
} from "../../../api/homepage/eventPageService";
import "./EventsPage.css";

const COMPLETED_EVENTS_PER_PAGE = 6;
const UPCOMING_EVENTS_PER_PAGE = 10;
const CATEGORY_COLORS = {
  SEMINAR: "#0f2463",
  WORKSHOP: "#10b981",
  WEBINAR: "#14b8a6",
  CONFERENCE: "#6366f1",
  CEREMONY: "#ec4899",
  "JOB FAIR": "#f59e0b",
  "JOB DRIVE": "#dc2626",
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

function normalizeEventStatus(event) {
  return String(event.event_status ?? event.status ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function toEvent(event) {
  const isJobEvent = Boolean(event.job_event_id);
  const eventTitle = isJobEvent ? event.event_name : event.event_title;
  const eventType = isJobEvent
    ? event.event_type === "JOB_FAIR"
      ? "JOB FAIR"
      : "JOB DRIVE"
    : event.event_type;
  const photoUrls = isJobEvent
    ? event.jobevent_photos || []
    : event.event_documents || [];
  const photos = photoUrls.map((url, index) => ({
    url,
    caption: `${eventTitle} photo ${index + 1}`,
  }));
  const fallbackPhoto =
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&auto=format&fit=crop&q=80";
  return {
    ...event,
    id: isJobEvent ? `job-${event.job_event_id}` : event.event_id,
    event_status: normalizeEventStatus(event),
    title: eventTitle,
    date: formatDate(event.event_date),
    dateObj: new Date(event.event_date),
    startTime: formatTime(event.event_start_time),
    endTime: formatTime(event.event_end_time),
    location: isJobEvent ? event.address : event.venue,
    category: eventType,
    description: isJobEvent ? event.description : event.event_description,
    event_link: isJobEvent ? event.google_map_link : event.event_link,
    isJobEvent,
    coverImage: photos[0]?.url || fallbackPhoto,
    photos: photos.length
      ? photos
      : [{ url: fallbackPhoto, caption: eventTitle }],
  };
}

function EmptyState({ title, text }) {
  return (
    <div className="ep-empty">
      <div className="ep-empty__icon">
        {title === "No Events Found" ? "🔍" : "📅"}
      </div>
      <h3 className="ep-empty__heading">{title}</h3>
      <p className="ep-empty__text">{text}</p>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [filterYear, setFilterYear] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUpcomingPage, setCurrentUpcomingPage] = useState(1);
  // Which of the two sections is showing - "upcoming" or "completed".
  // Only one section renders at a time; the tab bar right after the
  // hero switches between them (see ep-view-tabs below).
  const [activeView, setActiveView] = useState("upcoming");

  useEffect(() => {
    async function loadEvents() {
      try {
        const [firstPage, firstJobPage] = await Promise.all([
          getPublicEvents({ page: 1, limit: 50 }),
          getPublicJobEvents({ page: 1, limit: 50 }),
        ]);
        const allEvents = [
          ...(firstPage.events || []),
          ...(firstJobPage.jobFairs || []),
          ...(firstJobPage.jobDrives || []),
        ];
        const totalPages = firstPage.pagination?.totalPages || 1;
        const totalJobPages = firstJobPage.pagination?.totalPages || 1;

        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = await getPublicEvents({ page, limit: 50 });
          allEvents.push(...(nextPage.events || []));
        }

        for (let page = 2; page <= totalJobPages; page += 1) {
          const nextJobPage = await getPublicJobEvents({ page, limit: 50 });
          allEvents.push(
            ...(nextJobPage.jobFairs || []),
            ...(nextJobPage.jobDrives || []),
          );
        }

        setEvents(allEvents.map(toEvent));
      } catch {
        setLoadError(
          "Unable to load events right now. Please try again later.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, []);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.event_status === "UPCOMING" ||
            event.event_status === "ONGOING",
        )
        .sort((a, b) => b.dateObj - a.dateObj),
    [events],
  );
  const completedEvents = useMemo(
    () => events.filter((event) => event.event_status === "COMPLETED"),
    [events],
  );
  const years = useMemo(
    () =>
      [
        ...new Set(
          completedEvents.map((event) => event.dateObj.getUTCFullYear()),
        ),
      ].sort((a, b) => b - a),
    [completedEvents],
  );
  const categories = useMemo(
    () => [...new Set(completedEvents.map((event) => event.category))].sort(),
    [completedEvents],
  );
  const filtered = useMemo(() => {
    let list = [...completedEvents];
    if (filterYear !== "all")
      list = list.filter(
        (event) => event.dateObj.getUTCFullYear() === Number(filterYear),
      );
    if (filterCat !== "all")
      list = list.filter((event) => event.category === filterCat);
    if (dateFrom)
      list = list.filter(
        (event) => event.dateObj >= new Date(`${dateFrom}T00:00:00Z`),
      );
    if (dateTo)
      list = list.filter(
        (event) => event.dateObj <= new Date(`${dateTo}T23:59:59Z`),
      );
    list.sort((a, b) =>
      sortBy === "newest" ? b.dateObj - a.dateObj : a.dateObj - b.dateObj,
    );
    return list;
  }, [completedEvents, dateFrom, dateTo, filterCat, filterYear, sortBy]);
  const totalPages = Math.ceil(filtered.length / COMPLETED_EVENTS_PER_PAGE);
  const totalUpcomingPages = Math.ceil(
    upcomingEvents.length / UPCOMING_EVENTS_PER_PAGE,
  );
  const paginatedUpcoming = upcomingEvents.slice(
    (currentUpcomingPage - 1) * UPCOMING_EVENTS_PER_PAGE,
    currentUpcomingPage * UPCOMING_EVENTS_PER_PAGE,
  );
  const paginated = filtered.slice(
    (currentPage - 1) * COMPLETED_EVENTS_PER_PAGE,
    currentPage * COMPLETED_EVENTS_PER_PAGE,
  );
  const changeFilter = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };
  const resetFilters = () => {
    setSortBy("newest");
    setFilterYear("all");
    setFilterCat("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };
  const hasActiveFilters =
    filterYear !== "all" ||
    filterCat !== "all" ||
    dateFrom ||
    dateTo ||
    sortBy !== "newest";
  const closeLightbox = () => setLightbox(null);
  const changePhoto = (direction) =>
    setLightbox((current) => ({
      ...current,
      index:
        (current.index + direction + current.photos.length) %
        current.photos.length,
    }));

  return (
    <div className="events-page">
      <Header />
      <Navbar />
      <section className="ep-hero">
        <div className="ep-hero__inner">
          <div>
            <div className="ep-eyebrow">Events &amp; Programmes</div>
            <h1 className="ep-hero__title">
              Where Skills Meet
              <br />
              Opportunity
            </h1>
            <p className="ep-hero__sub">
              Summits, placement drives, and community events across all CII
              centres, bringing industry and youth together.
            </p>
          </div>
          <div className="ep-hero__stats">
            <div className="ep-stat">
              <span className="ep-stat__num">{events.length}</span>
              <span className="ep-stat__label">Events Hosted</span>
            </div>
            <div className="ep-stat">
              <span className="ep-stat__num">{upcomingEvents.length}</span>
              <span className="ep-stat__label">Upcoming</span>
            </div>
            <div className="ep-stat">
              <span className="ep-stat__num">{completedEvents.length}</span>
              <span className="ep-stat__label">Completed</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ep-view-tabs-wrap">
        <div className="ep-view-tabs" role="tablist" aria-label="Event view">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "upcoming"}
            className={`ep-view-tab${activeView === "upcoming" ? " ep-view-tab--active" : ""}`}
            onClick={() => setActiveView("upcoming")}
          >
            Upcoming Events
            <span className="ep-view-tab__count">{upcomingEvents.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "completed"}
            className={`ep-view-tab${activeView === "completed" ? " ep-view-tab--active" : ""}`}
            onClick={() => setActiveView("completed")}
          >
            Completed Events
            <span className="ep-view-tab__count">{completedEvents.length}</span>
          </button>
        </div>
      </div>

      {activeView === "upcoming" && (
        <section className="ep-section" id="upcoming">
          <div className="ep-section__inner">
            <div className="ep-eyebrow">Don't Miss Out</div>
            <h2 className="ep-section__title">Upcoming Events</h2>
            {isLoading ? (
              <EmptyState
                title="Loading Events"
                text="Fetching the latest events..."
              />
            ) : loadError ? (
              <EmptyState title="Events Unavailable" text={loadError} />
            ) : upcomingEvents.length === 0 ? (
              <EmptyState
                title="No Upcoming Events"
                text="There are no events scheduled at the moment. Check back soon for new events."
              />
            ) : (
              <div className="ep-upcoming-grid">
                {paginatedUpcoming.map((event) => (
                  <UpcomingCard key={event.id} event={event} />
                ))}
              </div>
            )}
            {totalUpcomingPages > 1 && (
              <Pagination
                currentPage={currentUpcomingPage}
                totalPages={totalUpcomingPages}
                onPageChange={setCurrentUpcomingPage}
              />
            )}
          </div>
        </section>
      )}

      {activeView === "completed" && (
        <section className="ep-section ep-section--grey" id="past">
          <div className="ep-section__inner">
            <div className="ep-eyebrow">Highlights</div>
            <h2 className="ep-section__title">Completed Events</h2>
            <div className="ep-filter-bar">
              <FilterSelect
                label="Sort By"
                value={sortBy}
                onChange={changeFilter(setSortBy)}
                options={[
                  ["newest", "Newest First"],
                  ["oldest", "Oldest First"],
                ]}
              />
              <FilterSelect
                label="Year"
                value={filterYear}
                onChange={changeFilter(setFilterYear)}
                options={[
                  ["all", "All Years"],
                  ...years.map((year) => [year, year]),
                ]}
              />
              <FilterSelect
                label="Type"
                value={filterCat}
                onChange={changeFilter(setFilterCat)}
                options={[
                  ["all", "All Types"],
                  ...categories.map((category) => [category, category]),
                ]}
              />
              <DateFilter
                label="From Date"
                value={dateFrom}
                onChange={changeFilter(setDateFrom)}
              />
              <DateFilter
                label="To Date"
                value={dateTo}
                onChange={changeFilter(setDateTo)}
              />
              {hasActiveFilters && (
                <button className="ep-filter-reset" onClick={resetFilters}>
                  ✕ Reset
                </button>
              )}
            </div>
            <div className="ep-results-info">
              Showing <strong>{filtered.length}</strong> completed event
              {filtered.length !== 1 ? "s" : ""}
            </div>
            {isLoading ? (
              <EmptyState
                title="Loading Events"
                text="Fetching the latest events..."
              />
            ) : loadError ? (
              <EmptyState title="Events Unavailable" text={loadError} />
            ) : paginated.length === 0 ? (
              <EmptyState
                title="No Events Found"
                text="Try adjusting your filters or reset all filters."
              />
            ) : (
              <div className="ep-past-list">
                {paginated.map((event, index) => (
                  <PastCard
                    key={event.id}
                    event={event}
                    reverse={index % 2 !== 0}
                    onViewPhotos={() =>
                      setLightbox({ photos: event.photos, index: 0 })
                    }
                  />
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="ep-pagination">
                <button
                  className="ep-page-btn ep-page-arrow"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    key={page}
                    className={`ep-page-btn ${currentPage === page ? "ep-page-active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="ep-page-btn ep-page-arrow"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
                <span className="ep-page-info">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {lightbox && (
        <div className="ep-lightbox" onClick={closeLightbox}>
          <div
            className="ep-lightbox__box"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="ep-lightbox__close" onClick={closeLightbox}>
              ✕
            </button>
            <img
              src={lightbox.photos[lightbox.index].url}
              alt={lightbox.photos[lightbox.index].caption}
              className="ep-lightbox__img"
            />
            <div className="ep-lightbox__caption">
              {lightbox.photos[lightbox.index].caption}
            </div>
            <div className="ep-lightbox__controls">
              <button
                className="ep-lightbox__btn"
                onClick={() => changePhoto(-1)}
              >
                ‹
              </button>
              <span className="ep-lightbox__counter">
                {lightbox.index + 1} / {lightbox.photos.length}
              </span>
              <button
                className="ep-lightbox__btn"
                onClick={() => changePhoto(1)}
              >
                ›
              </button>
            </div>
            <div className="ep-lightbox__thumbs">
              {lightbox.photos.map((photo, index) => (
                <img
                  key={photo.url}
                  src={photo.url}
                  alt={photo.caption}
                  className={`ep-lightbox__thumb${index === lightbox.index ? " ep-lightbox__thumb--active" : ""}`}
                  onClick={() =>
                    setLightbox((current) => ({ ...current, index }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="ep-filter-group">
      <label className="ep-filter-label">{label}</label>
      <select
        className="ep-filter-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
function DateFilter({ label, value, onChange }) {
  return (
    <div className="ep-filter-group">
      <label className="ep-filter-label">{label}</label>
      <input
        type="date"
        className="ep-filter-date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
function UpcomingCard({ event }) {
  const mapUrl =
    event.event_link ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || event.title)}`;

  return (
    <div className="ep-ucard">
      <div className="ep-ucard__body">
        <div className="ep-ucard__top-row">
          <span
            className="ep-ucard__cat"
            style={{ background: CATEGORY_COLORS[event.category] || "#0f2463" }}
          >
            {event.category}
          </span>
          <div className="ep-ucard__date-row">
            <span>{event.date}</span>
            <span className="ep-ucard__dot" />
            <span>{event.event_status}</span>
          </div>
        </div>
        <h3 className="ep-ucard__title">{event.title}</h3>
        <p className="ep-ucard__desc">{event.description}</p>
        <div className="ep-ucard__location">
          <PinIcon /> {event.location}
        </div>
        {!event.isJobEvent && (
          <div className="ep-ucard__location">
            <ModeIcon /> <strong>{event.event_mode}</strong>
          </div>
        )}
        <div className="ep-ucard__location">
          <span>Time</span> {event.startTime} - {event.endTime}
        </div>
        <div className="ep-ucard__actions">
          {event.event_link && !event.isJobEvent && (
            <a
              className="ep-ucard__action ep-ucard__action--primary"
              href={event.event_link}
              target="_blank"
              rel="noreferrer"
            >
              View Event Link
            </a>
          )}
          <a
            className="ep-ucard__action ep-ucard__action--map"
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Locate Venue
          </a>
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="ep-pagination">
      <button
        className="ep-page-btn ep-page-arrow"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => (
          <button
            key={page}
            className={`ep-page-btn ${currentPage === page ? "ep-page-active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ),
      )}
      <button
        className="ep-page-btn ep-page-arrow"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        ›
      </button>
      <span className="ep-page-info">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
function PastCard({ event, reverse, onViewPhotos }) {
  return (
    <div className={`ep-pcard${reverse ? " ep-pcard--reverse" : ""}`}>
      <div className="ep-pcard__img-wrap">
        <img
          src={event.coverImage}
          alt={event.title}
          className="ep-pcard__img"
        />
        <span
          className="ep-pcard__cat"
          style={{ background: CATEGORY_COLORS[event.category] || "#0f2463" }}
        >
          {event.category}
        </span>
        <button className="ep-pcard__photo-btn" onClick={onViewPhotos}>
          <GalleryIcon /> View {event.photos.length} Photos
        </button>
      </div>
      <div className="ep-pcard__body">
        <div className="ep-pcard__date">{event.date}</div>
        <h3 className="ep-pcard__title">{event.title}</h3>
        <p className="ep-pcard__desc">{event.description}</p>
        <div className="ep-pcard__meta">
          <div className="ep-pcard__meta-item">
            <PinIcon />
            <span>{event.location}</span>
          </div>
          {!event.isJobEvent && (
            <div className="ep-pcard__meta-item">
              <span>{event.event_mode} event</span>
            </div>
          )}
          <div className="ep-pcard__meta-item">
            <span>
              {event.startTime} - {event.endTime}
            </span>
          </div>
        </div>
        <div className="ep-pcard__actions">
          <button className="ep-pcard__gallery-btn" onClick={onViewPhotos}>
            <GalleryIcon /> View Event Photos
          </button>
        </div>
      </div>
    </div>
  );
}
const PinIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const GalleryIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const ModeIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 21h8M12 19v2M8 9h8M8 13h5" />
  </svg>
);
