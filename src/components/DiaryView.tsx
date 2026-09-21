import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  mdiNavigation,
  mdiMagnify,
  mdiAccountMultiple,
  mdiCrosshairsGps,
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
import LocationPickerModal from "./LocationPickerModal";
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
  onOpenComposer,
  onSwitchViewMode,
}: {
  entries: DiaryEntry[];
  onSelectEntryDetail: (entry: DiaryEntry) => void;
  onOpenComposer?: () => void;
  onSwitchViewMode?: (mode: DiaryViewMode) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const entriesRef = useRef(entries);
  const layersRef = useRef<{ adminLayer: any; satLayer: any } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<DiaryMood | "all">("all");
  const [currentMapType, setCurrentMapType] = useState<"admin" | "sat">(
    "admin",
  );
  const [isLocationPickerOpen, setIsLocationPickerOpen] =
    useState<boolean>(false);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Các bài viết hợp lệ có tọa độ
  const validEntries = useMemo(() => {
    return entries
      .filter(
        (e) =>
          e.lat !== null &&
          e.lat !== undefined &&
          e.lng !== null &&
          e.lng !== undefined &&
          Number(e.lat) !== 0 &&
          !isNaN(Number(e.lat)) &&
          !isNaN(Number(e.lng)),
      )
      .map((e) => ({
        ...e,
        lat: Number(e.lat),
        lng: Number(e.lng),
      })) as (DiaryEntry & { lat: number; lng: number })[];
  }, [entries]);

  // Lọc bài viết theo ô tìm kiếm & mood chip
  const displayedEntries = useMemo(() => {
    return validEntries.filter((e) => {
      // 1. Lọc theo Mood
      if (selectedMood !== "all" && e.mood !== selectedMood) return false;

      // 2. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchContent = (e.content || "").toLowerCase().includes(q);
        const matchLoc = (e.location || "").toLowerCase().includes(q);
        const matchTag = (e.tags || []).some((t) =>
          t.toLowerCase().includes(q),
        );
        if (!matchContent && !matchLoc && !matchTag) return false;
      }

      return true;
    });
  }, [validEntries, searchQuery, selectedMood]);

  const handleFitAllBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || displayedEntries.length === 0) return;
    const latLngs = displayedEntries.map((e) => [e.lat, e.lng]);

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 14);
    } else if (latLngs.length > 1) {
      map.fitBounds(latLngs as any, { padding: [80, 80], maxZoom: 16 });
    }
  }, [displayedEntries]);

  // Cập nhật marker theo danh sách bài viết đã lọc
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // 1. Xóa marker cũ
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 2. Marker vị trí người dùng (nếu đã định vị GPS)
    if (myCoords) {
      const myIcon = L.divIcon({
        className: "custom-my-location-marker",
        html: `
          <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;background:#0ea5e9;opacity:0.4;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:14px;height:14px;background:#0284c7;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const myMarker = L.marker([myCoords.lat, myCoords.lng], {
        icon: myIcon,
      }).addTo(map);
      myMarker.bindPopup(
        `<div style="font-size:12px;font-weight:bold;color:#0284c7;padding:2px;">📍 Vị trí hiện tại của bạn</div>`,
      );
      markersRef.current.push(myMarker);
    }

    // 3. Marker bài viết nhật ký
    displayedEntries.forEach((entry) => {
      const cfg = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.positive;
      const icon = L.divIcon({
        className: "custom-diary-marker",
        html: `
          <div style="
            background: ${cfg.hex};
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #fff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <span style="transform: rotate(45deg); font-size: 15px; line-height: 1;">${cfg.emoji}</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const m = L.marker([entry.lat, entry.lng], { icon }).addTo(map);

      const popupContent = document.createElement("div");
      popupContent.style.cssText =
        "min-width: 200px; max-width: 240px; font-family: sans-serif;";
      popupContent.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:16px;">${cfg.emoji}</span>
          <div style="min-width:0;flex:1;">
            <div style="font-size:11px;font-weight:800;color:#1e293b;">${entry.date}</div>
            ${entry.location ? `<div style="font-size:10px;color:#e11d48;font-weight:600;truncate;">📍 ${entry.location}</div>` : ""}
          </div>
        </div>
        <p style="font-size:11px;color:#475569;margin:0 0 8px 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${entry.content}</p>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button id="view-btn-${entry.id}" style="
            flex: 1;
            background: #0284c7;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-align: center;
          ">Chi tiết</button>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${entry.lat},${entry.lng}" target="_blank" rel="noopener noreferrer" style="
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            background: #f97316;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            text-align: center;
          ">
            <svg viewBox="0 0 24 24" width="12" height="12" style="fill:currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            Chỉ đường
          </a>
        </div>
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

    if (displayedEntries.length > 0) {
      handleFitAllBounds();
    }
  }, [displayedEntries, myCoords, handleFitAllBounds, onSelectEntryDetail]);

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Trình duyệt không hỗ trợ GPS");
      return;
    }
    const toastId = toast.loading("Đang xác định vị trí hiện tại...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setMyCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
        }
        toast.success("Đã xác định vị trí của bạn!");
      },
      (err) => {
        toast.dismiss(toastId);
        toast.error("Không thể lấy vị trí: " + err.message);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  const handleToggleMapLayer = (type: "admin" | "sat") => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current) return;
    const { adminLayer, satLayer } = layersRef.current;

    if (type === "admin") {
      map.removeLayer(satLayer);
      map.addLayer(adminLayer);
      setCurrentMapType("admin");
    } else {
      map.removeLayer(adminLayer);
      map.addLayer(satLayer);
      setCurrentMapType("sat");
    }
  };

  // Khởi tạo bản đồ
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
        updateMarkers();
        return;
      }

      const center: [number, number] =
        validEntries.length > 0
          ? [validEntries[0].lat, validEntries[0].lng]
          : [9.9482, 106.3356];

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        maxBounds: VN_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 5,
        tap: false,
      }).setView(center, 13);

      const mapTilerKey = "odL8F5mMYH7APbT24t4Q";
      const adminLayer = L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
        {
          maxZoom: 19,
          attribution: "&copy; MapTiler &copy; OpenStreetMap",
        },
      ).addTo(map);

      const satLayer = L.tileLayer(
        `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${mapTilerKey}`,
        {
          maxZoom: 19,
          attribution: "&copy; MapTiler &copy; OpenStreetMap",
        },
      );

      layersRef.current = { adminLayer, satLayer };
      mapInstanceRef.current = map;
      updateMarkers();
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

  // Tự động đồng bộ marker mỗi khi bộ lọc thay đổi
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  const [isCarouselOpen, setIsCarouselOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-30 w-full h-full bg-slate-100 dark:bg-slate-900 overflow-hidden select-none">
      {/* 1. Leaflet Map Full Viewport */}
      <div ref={mapRef} className="w-full h-full" />

      {/* 2. Top Floating Search Box & Action Controls */}
      <div className="fixed top-3 pt-safe left-0 right-0 z-[1000] px-3.5 flex flex-col gap-2 max-w-md mx-auto pointer-events-none">
        {/* Row 1: Search + Add Location Button */}
        <div className="flex items-center gap-2 w-full">
          <div className="pointer-events-auto flex-1 flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full px-3.5 py-2.5 shadow-lg border border-slate-200/80 dark:border-slate-700/80">
            <Icon
              path={mdiMagnify}
              size={0.75}
              className="text-slate-400 shrink-0"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm địa điểm, nội dung nhật ký..."
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <Icon path={mdiClose} size={0.6} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenComposer}
            className="pointer-events-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-full shadow-lg flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.65} />
            <span>Viết bài</span>
          </button>
        </div>

        {/* Row 2: Mood & Categories Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedMood("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
              selectedMood === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                : "bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100"
            }`}
          >
            Tất cả ({validEntries.length})
          </button>

          {(Object.keys(MOOD_CONFIG) as DiaryMood[]).map((mKey) => {
            const cfg = MOOD_CONFIG[mKey];
            const isSelected = selectedMood === mKey;
            const count = validEntries.filter((e) => e.mood === mKey).length;
            if (count === 0 && !isSelected) return null;

            return (
              <button
                key={mKey}
                type="button"
                onClick={() => setSelectedMood(isSelected ? "all" : mKey)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                    : "bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100"
                }`}
              >
                <span>{cfg.emoji}</span>
                <span>
                  {cfg.label} ({count})
                </span>
              </button>
            );
          })}

          {onSwitchViewMode && (
            <button
              type="button"
              onClick={() => onSwitchViewMode("feed")}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <Icon path={mdiBookOpenVariant} size={0.6} />
              <span>Bản tin</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Floating Action Controls on Right */}
      <div
        className={`fixed right-3 z-[1000] flex flex-col items-end gap-2 pointer-events-auto transition-all duration-300 ${
          isCarouselOpen ? "bottom-[225px]" : "bottom-[100px]"
        }`}
      >
        {/* Layer Switcher */}
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleToggleMapLayer("admin")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
              currentMapType === "admin"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            Hành chính
          </button>
          <button
            type="button"
            onClick={() => handleToggleMapLayer("sat")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
              currentMapType === "sat"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            Vệ tinh
          </button>
        </div>

        {/* Hiệu chỉnh vị trí */}
        <button
          type="button"
          onClick={() => setIsLocationPickerOpen(true)}
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          <Icon path={mdiMapMarker} size={0.65} className="text-rose-500" />
          <span>Chọn tọa độ</span>
        </button>

        {/* Định vị tôi */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
        >
          <Icon path={mdiCrosshairsGps} size={0.65} className="text-blue-500" />
          <span>Định vị tôi</span>
        </button>

        {/* Thu phóng toàn bộ */}
        {displayedEntries.length > 0 && (
          <button
            type="button"
            onClick={handleFitAllBounds}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <Icon path={mdiEyeOutline} size={0.65} className="text-amber-500" />
            <span>Toàn cảnh ({displayedEntries.length})</span>
          </button>
        )}
      </div>

      {/* 4. Bottom Floating Card Carousel (Real Diary Entries) - Positioned above bottom Navbar */}
      <div
        className={`fixed bottom-[100px] z-[1000] pointer-events-auto transition-all duration-300 ${
          isCarouselOpen
            ? "left-3.5 right-3.5 max-w-md mx-auto"
            : "left-3.5 max-w-fit"
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] border border-slate-200/80 dark:border-slate-700/80 p-2.5 space-y-1.5">
          {/* Header with Toggle */}
          <div
            className="flex items-center justify-between gap-3 px-1 cursor-pointer select-none"
            onClick={() => setIsCarouselOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                Địa điểm ({displayedEntries.length} bài)
              </span>
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline whitespace-nowrap">
              {isCarouselOpen ? "Thu gọn ▲" : "Mở rộng ▼"}
            </span>
          </div>

          {/* Horizontal Posts List */}
          {isCarouselOpen &&
            (displayedEntries.length === 0 ? (
              <div className="py-2.5 px-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Không có bài viết nào khớp bộ lọc
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {displayedEntries.map((entry) => {
                  const cfg = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.positive;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo(
                            [entry.lat, entry.lng],
                            16,
                            { duration: 1 },
                          );
                        }
                      }}
                      className="flex-1 min-w-[170px] max-w-[210px] bg-slate-100/90 dark:bg-slate-700/60 hover:bg-slate-200/80 dark:hover:bg-slate-700 p-2 rounded-xl flex flex-col gap-1 border border-slate-200/60 dark:border-slate-600/60 transition-all active:scale-95 cursor-pointer text-left"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm leading-none">
                          {cfg.emoji}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {entry.date}
                        </span>
                      </div>
                      {entry.location && (
                        <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500 truncate">
                          <Icon
                            path={mdiMapMarker}
                            size={0.45}
                            className="shrink-0"
                          />
                          <span className="truncate">{entry.location}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 leading-tight">
                        {entry.content}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </div>

      {/* 5. Location Calibration Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        initialLat={myCoords?.lat || (validEntries[0]?.lat ?? 9.9482)}
        initialLng={myCoords?.lng || (validEntries[0]?.lng ?? 106.3356)}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelectLocation={(selectedLat, selectedLng) => {
          setMyCoords({ lat: selectedLat, lng: selectedLng });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([selectedLat, selectedLng], 16, {
              duration: 1,
            });
          }
          toast.success(
            `Đã chọn tọa độ: [${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}]`,
          );
        }}
      />
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
  const [isComposerOpen, setIsComposerOpen] = useState(false);

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
  const [detailLightboxIndex, setDetailLightboxIndex] = useState<number | null>(
    null,
  );

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
      { rootMargin: "300px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [hasMore, loading]);

  const handleSaveComposer = async (
    entryData: Omit<DiaryEntry, "id" | "_id" | "createdAt">,
  ) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      await addEntry(entryData);
    }
  };

  const handleAddReply = async (entryId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const nowStr = new Date().toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const newReply: DiaryReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        time: nowStr,
        content: content.trim(),
        authorName,
        authorAvatar,
      };

      const entry = entries.find(
        (e) => e.id === entryId || (e as any)._id === entryId,
      );
      const existingReplies = entry?.replies || [];
      const updatedReplies = [...existingReplies, newReply];

      await updateEntry(entryId, { replies: updatedReplies });

      if (
        detailEntry &&
        (detailEntry.id === entryId || (detailEntry as any)._id === entryId)
      ) {
        setDetailEntry({ ...detailEntry, replies: updatedReplies });
      }

      toast.success("Đã đăng bình luận!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu bình luận");
    }
  };

  const handleDeleteReply = async (entryId: string, replyId: string) => {
    try {
      const entry = entries.find(
        (e) => e.id === entryId || (e as any)._id === entryId,
      );
      if (!entry) return;
      const updatedReplies = (entry.replies || []).filter(
        (r) => r.id !== replyId,
      );

      await updateEntry(entryId, { replies: updatedReplies });

      if (
        detailEntry &&
        (detailEntry.id === entryId || (detailEntry as any)._id === entryId)
      ) {
        setDetailEntry({ ...detailEntry, replies: updatedReplies });
      }

      toast.success("Đã xóa bình luận!");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xóa bình luận");
    }
  };

  const handleSaveReply = async () => {
    if (!detailEntry || !replyText.trim()) return;
    setIsSavingReply(true);
    try {
      const targetId = detailEntry.id || (detailEntry as any)._id;
      await handleAddReply(targetId, replyText);
      setReplyText("");
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

  // ── MAP VIEW: FULL-SCREEN IMMERSIVE OVERLAY (Ẩn header, nền full màn hình) ──
  if (viewMode === "map") {
    return (
      <>
        <LeafletMap
          entries={entries}
          onSelectEntryDetail={(entry) => setDetailEntry(entry)}
          onOpenComposer={() => setIsComposerOpen(true)}
          onSwitchViewMode={(mode) => setViewMode(mode)}
        />

        {/* Modal Composer for creating new post / location */}
        {isComposerOpen && (
          <NewsfeedComposer
            isModal={true}
            authorAvatar={authorAvatar}
            authorName={authorName}
            onSave={handleSaveComposer}
            onClose={() => setIsComposerOpen(false)}
          />
        )}

        {/* Edit Entry Modal */}
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
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
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

                    {detailEntry.lat && detailEntry.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${detailEntry.lat},${detailEntry.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                      >
                        <Icon path={mdiNavigation} size={0.55} />
                        <span>Chỉ đường</span>
                      </a>
                    )}
                  </div>

                  {/* Body Text */}
                  <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                    {detailEntry.content}
                  </p>

                  {/* Images Lightbox / Gallery */}
                  {(() => {
                    const detailImgs = Array.isArray(detailEntry.images)
                      ? detailEntry.images.filter(
                          (img) =>
                            typeof img === "string" && img.trim().length > 0,
                        )
                      : typeof detailEntry.images === "string" &&
                          (detailEntry.images as string).trim().length > 0
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
                              className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 cursor-pointer border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={getThumbnailUrl(imgUrl, 160)}
                                alt={`Ảnh ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Reply section */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveReply();
                        }
                      }}
                      placeholder="Viết bình luận..."
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSaveReply}
                      disabled={isSavingReply || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {isSavingReply ? (
                        <Icon
                          path={mdiLoading}
                          size={0.6}
                          className="animate-spin"
                        />
                      ) : (
                        "Gửi"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Lightbox Modal */}
        {detailLightboxIndex !== null && detailEntry && (
          <PhotoLightboxModal
            isOpen={detailLightboxIndex !== null}
            images={
              Array.isArray(detailEntry.images)
                ? detailEntry.images
                : [detailEntry.images || ""]
            }
            initialIndex={detailLightboxIndex}
            onClose={() => setDetailLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-6 space-y-4">
      {/* Header */}
      <DiaryHeader streakData={streakData} totalEntries={entries.length} />

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
            (viewMode as string) === "map"
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
          <span>Sự kiện</span>
        </button>
      </div>

      {/* Mood Analytics (Show only in Feed) */}
      {(viewMode === "feed" || viewMode === "timeline") && (
        <MoodAnalyticsCard stats={moodStats} totalEntries={entries.length} />
      )}

      {/* Search & Filters */}
      {(viewMode === "feed" || viewMode === "timeline") && (
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
      )}

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
                {search
                  ? "Không tìm thấy bài viết nào"
                  : "Chưa có bài viết bản tin nào"}
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
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
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

      {/* VIEW: CALENDAR & EVENTS (LỊCH VÀ SỰ KIỆN) */}
      {viewMode === "calendar" && (
        <CalendarView month={calendarMonth} onMonthChange={setCalendarMonth} />
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

                  {detailEntry.lat && detailEntry.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${detailEntry.lat},${detailEntry.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <Icon path={mdiNavigation} size={0.55} />
                      <span>Chỉ đường</span>
                    </a>
                  )}
                </div>

                {/* Body Text */}
                <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                  {detailEntry.content}
                </p>

                {/* Images Lightbox / Gallery */}
                {(() => {
                  const detailImgs = Array.isArray(detailEntry.images)
                    ? detailEntry.images.filter(
                        (img) =>
                          typeof img === "string" && img.trim().length > 0,
                      )
                    : typeof detailEntry.images === "string" &&
                        (detailEntry.images as string).trim().length > 0
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
                              src={getThumbnailUrl(imgUrl, 80)}
                              onError={(e) => {
                                if (e.currentTarget.src !== imgUrl) {
                                  e.currentTarget.src = imgUrl;
                                }
                              }}
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
                            <span className="text-[10px] text-slate-400">
                              {r.time}
                            </span>
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
          document.body,
        )}

      {/* Lightbox for Detail Modal */}
      {detailEntry && detailLightboxIndex !== null && (
        <PhotoLightboxModal
          isOpen={detailLightboxIndex !== null}
          images={
            Array.isArray(detailEntry.images)
              ? detailEntry.images.filter(
                  (img) => typeof img === "string" && img.trim().length > 0,
                )
              : typeof detailEntry.images === "string" &&
                  (detailEntry.images as string).trim().length > 0
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
