import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiPlus,
  mdiClose,
  mdiDeleteOutline,
  mdiPencil,
  mdiMapMarker,
  mdiCalendar,
  mdiTag,
  mdiLoading,
  mdiFormatListBulleted,
  mdiMap,
  mdiCommentTextOutline,
  mdiBookOpenVariant,
  mdiCalendarMonth,
  mdiSatelliteVariant,
  mdiEyeOutline,
  mdiArrowLeft,
  mdiHeart,
  mdiShareVariant,
  mdiPin,
  mdiPinOff,
} from "@mdi/js";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import toast from "react-hot-toast";
import type {
  DiaryEntry,
  DiaryMood,
  DiaryReply,
  DiaryViewMode,
} from "../types";
import { getLocalDateString, getLocalMonthString } from "../utils/date";
import { useDiary } from "../hooks/useDiary";
import { useUserProfile } from "../hooks/useUserProfile";
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import DiaryHeader from "./DiaryHeader";
import SearchFilterBar from "./SearchFilterBar";
import MoodAnalyticsCard from "./MoodAnalyticsCard";
import EntryCard from "./EntryCard";
import CalendarView from "./CalendarView";
import NewsfeedComposer from "./NewsfeedComposer";
import {
  DiarySkeletonTimeline,
  DiarySkeletonCalendar,
  DiarySkeletonFeedPost,
} from "./DiarySkeleton";
import PhotoLightboxModal from "./PhotoLightboxModal";
import { getThumbnailUrl } from "../utils/imageUtils";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const VN_BOUNDS: [[number, number], [number, number]] = [
  [8.0, 102.0],
  [24.0, 110.0],
];

function LeafletMap({
  entries,
  onSelectEntryDetail,
  isFullScreen = false,
  onBack,
}: {
  entries: DiaryEntry[];
  onSelectEntryDetail: (entry: DiaryEntry) => void;
  isFullScreen?: boolean;
  onBack?: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const validEntries = entries.filter(
    (e) =>
      e.lat !== null &&
      e.lat !== undefined &&
      e.lng !== null &&
      e.lng !== undefined &&
      e.lat !== 0,
  ) as (DiaryEntry & { lat: number; lng: number })[];

  const handleFitAllBounds = useCallback(() => {
    if (!mapInstanceRef.current || validEntries.length === 0) return;
    const latLngs = validEntries.map((e) => [e.lat, e.lng]);
    if (latLngs.length === 1) {
      mapInstanceRef.current.setView(latLngs[0], 14);
    } else {
      mapInstanceRef.current.fitBounds(latLngs as any, { padding: [40, 40] });
    }
  }, [validEntries]);

  useEffect(() => {
    if (!mapRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    if (!document.querySelector('link[href*="leaflet"]'))
      document.head.appendChild(link);

    let isMounted = true;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || !isMounted) return;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      const center: [number, number] =
        validEntries.length > 0
          ? [validEntries[0].lat, validEntries[0].lng]
          : [16.047, 108.206];
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
        maxBounds: VN_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 5,
        tap: false,
      }).setView(center, 12);
      const mapTilerKey = "odL8F5mMYH7APbT24t4Q"; // MapTiler Key
      const adminLayer = L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      ).addTo(map);
      const satLayer = L.tileLayer(
        `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      );
      const MapStyleControl = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
          div.style.cssText =
            "display:flex;gap:2px;background:#fff;border-radius:10px;padding:3px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:sans-serif";
          div.innerHTML = `
            <button data-layer="admin" style="display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border:none;border-radius:8px;font-size:9px;font-weight:800;cursor:pointer;background:#06b6d4;color:#fff;transition:all 0.2s">
              <svg viewBox="0 0 24 24" width="13" height="13" style="fill:currentColor"><path d="${mdiMap}"/></svg>
              Hành chính
            </button>
            <button data-layer="sat" style="display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border:none;border-radius:8px;font-size:9px;font-weight:800;cursor:pointer;background:transparent;color:#64748b;transition:all 0.2s">
              <svg viewBox="0 0 24 24" width="13" height="13" style="fill:currentColor"><path d="${mdiSatelliteVariant}"/></svg>
              Vệ tinh
            </button>
          `;
          const btns = div.querySelectorAll("button");
          const activeStyle =
            "display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border:none;border-radius:8px;font-size:9px;font-weight:800;cursor:pointer;background:#06b6d4;color:#fff";
          const inactiveStyle =
            "display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border:none;border-radius:8px;font-size:9px;font-weight:800;cursor:pointer;background:transparent;color:#64748b";
          btns.forEach((btn) => {
            btn.onclick = () => {
              if (btn.dataset.layer === "admin") {
                map.removeLayer(satLayer);
                map.addLayer(adminLayer);
                btns[0].style.cssText = activeStyle;
                btns[1].style.cssText = inactiveStyle;
              } else {
                map.removeLayer(adminLayer);
                map.addLayer(satLayer);
                btns[1].style.cssText = activeStyle;
                btns[0].style.cssText = inactiveStyle;
              }
            };
          });
          return div;
        },
      });
      new MapStyleControl({ position: "topright" }).addTo(map);

      mapInstanceRef.current = map;

      const renderMarkers = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        validEntries.forEach((entry) => {
          const cfg = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
          const icon = L.divIcon({
            className: "custom-diary-marker",
            html: `
              <div style="
                background: ${cfg.hex};
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #fff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                cursor: pointer;
              ">
                <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${cfg.emoji}</span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          const m = L.marker([entry.lat, entry.lng], { icon }).addTo(map);

          const popupContent = document.createElement("div");
          popupContent.style.cssText = "min-width: 180px; max-width: 220px; font-family: sans-serif;";
          popupContent.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:16px;">${cfg.emoji}</span>
              <span style="font-size:11px;font-weight:800;color:#1e293b;">${entry.date}</span>
            </div>
            <p style="font-size:11px;color:#475569;margin:0 0 8px 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${entry.content}</p>
            <button id="view-btn-${entry.id}" style="
              width: 100%;
              background: #06b6d4;
              color: #fff;
              border: none;
              border-radius: 8px;
              padding: 4px 8px;
              font-size: 10px;
              font-weight: 800;
              cursor: pointer;
            ">Xem chi tiết bài viết</button>
          `;

          m.bindPopup(popupContent);
          m.on("popupopen", () => {
            const btn = document.getElementById(`view-btn-${entry.id}`);
            if (btn) {
              btn.onclick = () => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.closePopup();
                }
                const currentE = entriesRef.current.find((e) => e.id === entry.id);
                if (currentE) onSelectEntryDetail(currentE);
              };
            }
          });

          markersRef.current.push(m);
        });
      };

      renderMarkers();
      if (validEntries.length > 0) {
        handleFitAllBounds();
      }
    };

    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        if (isMounted) initMap();
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm ${
        isFullScreen ? "h-[calc(100vh-140px)]" : "h-[450px]"
      }`}
    >
      <div ref={mapRef} className="w-full h-full" />
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-3 left-3 z-[1000] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Icon path={mdiArrowLeft} size={0.65} />
          <span>Quay lại</span>
        </button>
      )}
      <button
        onClick={handleFitAllBounds}
        className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
      >
        <span>🔍 Thu phóng toàn bộ ({validEntries.length} địa điểm)</span>
      </button>
    </div>
  );
}

export default function DiaryView() {
  const {
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    pinEntry,
    getFilteredEntries,
    streakData,
    moodStats,
  } = useDiary();

  const { profile: userProfile } = useUserProfile();
  const authorAvatar = userProfile?.avatar || "/avatar.jpg";
  const authorName = userProfile?.fullName || "Lâm Huệ Trung";

  const [viewMode, setViewMode] = useState<DiaryViewMode>("feed");
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<DiaryEntry | null>(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<DiaryMood | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [calendarMonth, setCalendarMonth] = useState(getLocalMonthString());

  // Infinite Scroll Pagination State
  const PAGE_SIZE = 8;
  const [displayLimit, setDisplayLimit] = useState<number>(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Lightbox modal state for detail view
  const [detailLightboxIndex, setDetailLightboxIndex] = useState<number | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const dragControlsDetail = useDragControls();

  const filteredEntries = getFilteredEntries(
    search,
    selectedMood,
    "",
    null,
    sort,
  );

  // Reset displayLimit khi filter hoặc viewMode thay đổi
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [search, selectedMood, sort, viewMode]);

  // Các bài viết đang hiển thị (Pagination slice)
  const visibleEntries = filteredEntries.slice(0, displayLimit);
  const hasMore = displayLimit < filteredEntries.length;

  // IntersectionObserver gắn vào sentinel ở đáy danh sách
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          const timer = setTimeout(() => {
            setDisplayLimit((prev) => prev + PAGE_SIZE);
            setIsLoadingMore(false);
          }, 300);
          return () => clearTimeout(timer);
        }
      },
      { rootMargin: "300px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasMore, loading]);

  const handleSaveComposer = async (entryData: Omit<DiaryEntry, "id" | "_id" | "createdAt">) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      await addEntry(entryData);
    }
  };

  const handleSaveReply = async () => {
    if (!detailEntry || !replyText.trim()) return;
    setIsSavingReply(true);
    try {
      const nowStr = new Date().toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const newReply: DiaryReply = {
        id: Date.now().toString(),
        time: nowStr,
        content: replyText.trim(),
      };
      const updatedReplies = [...(detailEntry.replies || []), newReply];
      await updateEntry(detailEntry.id, { replies: updatedReplies });
      setDetailEntry({ ...detailEntry, replies: updatedReplies });
      setReplyText("");
      toast.success("Đã gửi phản hồi!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu phản hồi");
    } finally {
      setIsSavingReply(false);
    }
  };

  const handleDelete = (id: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-slate-800">Xóa bài viết này?</p>
          <p className="text-xs text-slate-500">
            Hành động này không thể khôi phục sau khi xóa.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await deleteEntry(id);
                  if (detailEntry?.id === id) setDetailEntry(null);
                  toast.success("Đã xóa bài viết!");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  const handleSelectCalendarDate = (date: string) => {
    setSearch(date);
    setViewMode("feed");
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-32 space-y-4">
      {/* Header */}
      <DiaryHeader
        streakData={streakData}
        totalEntries={entries.length}
      />

      {/* View Mode Tabs (Bản tin / Bản đồ / Lịch & Sự kiện) */}
      <div className="flex items-center justify-between gap-2 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setViewMode("feed")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === "feed" || viewMode === "timeline"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <Icon path={mdiBookOpenVariant} size={0.75} />
          <span>Bản tin</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("map")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === "map"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <Icon path={mdiMap} size={0.75} />
          <span>Bản đồ</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("calendar")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            viewMode === "calendar"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <Icon path={mdiCalendarMonth} size={0.75} />
          <span>Lịch & Sự kiện</span>
        </button>
      </div>

      {/* Mood Analytics (Show only in Feed) */}
      {(viewMode === "feed" || viewMode === "timeline") && (
        <MoodAnalyticsCard stats={moodStats} totalEntries={entries.length} />
      )}

      {/* Search & Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedMood={selectedMood}
        onMoodChange={setSelectedMood}
        sort={sort}
        onSortChange={setSort}
        totalCount={entries.length}
        filteredCount={filteredEntries.length}
      />

      {/* VIEW: FEED (BẢN TIN) */}
      {(viewMode === "feed" || viewMode === "timeline") && (
        <div className="space-y-4">
          {/* Post Composer Box */}
          <NewsfeedComposer
            authorAvatar={authorAvatar}
            authorName={authorName}
            onSave={handleSaveComposer}
          />

          {/* Feed List */}
          {loading ? (
            <DiarySkeletonTimeline />
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-center space-y-2">
              <Icon
                path={mdiBookOpenVariant}
                size={2}
                className="mx-auto text-slate-300"
              />
              <p className="text-sm font-semibold text-slate-500">
                {search ? "Không tìm thấy bài viết nào" : "Chưa có bài viết bản tin nào"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleEntries.map((e, idx) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  index={idx}
                  authorAvatar={authorAvatar}
                  authorName={authorName}
                  onEdit={(entry) => setEditingEntry(entry)}
                  onDelete={handleDelete}
                  onPin={pinEntry}
                  onViewDetail={(entry) => setDetailEntry(entry)}
                />
              ))}

              {/* Scroll Loading Trigger / Sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="py-2">
                  <DiarySkeletonFeedPost />
                </div>
              )}

              {/* End of list marker */}
              {!hasMore && filteredEntries.length > 5 && (
                <div className="py-6 text-center">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-4 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                    ✓ Đã hiển thị tất cả {filteredEntries.length} bài viết
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: MAP (BẢN ĐỒ) */}
      {viewMode === "map" && (
        <LeafletMap
          entries={filteredEntries}
          onSelectEntryDetail={(entry) => setDetailEntry(entry)}
        />
      )}

      {/* VIEW: CALENDAR & EVENTS (LỊCH VÀ SỰ KIỆN) */}
      {viewMode === "calendar" && (
        <CalendarView
          entries={entries}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelectDate={handleSelectCalendarDate}
          onOpenCreateEntry={() => {
            setViewMode("feed");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Edit Entry Modal (using NewsfeedComposer) */}
      {editingEntry && (
        <NewsfeedComposer
          isModal={true}
          initialEntry={editingEntry}
          authorAvatar={authorAvatar}
          authorName={authorName}
          onSave={handleSaveComposer}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Post Detail & Comments Modal */}
      {detailEntry &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
            onClick={() => setDetailEntry(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700/80 my-auto"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={authorAvatar}
                    onError={(e) => {
                      e.currentTarget.src = "/avatar.jpg";
                    }}
                    alt={authorName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      {authorName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(detailEntry.date)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailEntry(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                >
                  <Icon path={mdiClose} size={0.8} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Mood & Location */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      MOOD_CONFIG[detailEntry.mood]?.color
                    }`}
                    style={{
                      backgroundColor: `${MOOD_CONFIG[detailEntry.mood]?.hex}18`,
                    }}
                  >
                    <span>{MOOD_CONFIG[detailEntry.mood]?.emoji}</span>
                    <span>{MOOD_CONFIG[detailEntry.mood]?.label}</span>
                  </span>

                  {detailEntry.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                      <Icon path={mdiMapMarker} size={0.65} />
                      {detailEntry.location}
                    </span>
                  )}
                </div>

                {/* Body Text */}
                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                  {detailEntry.content}
                </p>

                {/* Images Lightbox / Gallery */}
                {(() => {
                  const detailImgs = Array.isArray(detailEntry.images)
                    ? detailEntry.images.filter((img) => typeof img === "string" && img.trim().length > 0)
                    : typeof detailEntry.images === "string" && (detailEntry.images as string).trim().length > 0
                      ? [detailEntry.images]
                      : [];
                  if (detailImgs.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 block">
                        Hình ảnh ({detailImgs.length})
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {detailImgs.map((imgUrl, i) => (
                          <div
                            key={i}
                            onClick={() => setDetailLightboxIndex(i)}
                            className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 group block relative cursor-pointer"
                          >
                            <img
                              src={getThumbnailUrl(imgUrl, 600, 80)}
                              alt={`Detail photo ${i + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <span>Xem ảnh gốc</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Tags */}
                {detailEntry.tags && detailEntry.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    {detailEntry.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-xl"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comments & Replies list */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Bình luận & Phản hồi ({(detailEntry.replies || []).length})
                  </h5>

                  {(detailEntry.replies || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Chưa có phản hồi nào cho bài viết này.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailEntry.replies?.map((r) => (
                        <div
                          key={r.id}
                          className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span>💬 Phản hồi</span>
                            <span className="text-[10px] text-slate-400">{r.time}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {r.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reply Input Box */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveReply();
                    }
                  }}
                  placeholder="Viết phản hồi bài viết..."
                  className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveReply}
                  disabled={isSavingReply || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSavingReply ? "..." : "Gửi"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Lightbox for Detail Modal */}
      {detailEntry && detailLightboxIndex !== null && (
        <PhotoLightboxModal
          isOpen={detailLightboxIndex !== null}
          images={
            Array.isArray(detailEntry.images)
              ? detailEntry.images.filter((img) => typeof img === "string" && img.trim().length > 0)
              : typeof detailEntry.images === "string" && (detailEntry.images as string).trim().length > 0
                ? [detailEntry.images]
                : []
          }
          initialIndex={detailLightboxIndex}
          onClose={() => setDetailLightboxIndex(null)}
          title={`Ảnh chi tiết bài viết`}
        />
      )}
    </div>
  );
}
