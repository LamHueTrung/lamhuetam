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
  mdiChevronDown,
  mdiChevronRight,
  mdiLoading,
  mdiFormatListBulleted,
  mdiMap,
  mdiEarth,
  mdiCommentTextOutline,
  mdiBookOpenVariant,
  mdiCalendarMonth,
  mdiSatelliteVariant,
  mdiEyeOutline,
  mdiNavigation,
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
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import DiaryHeader from "./DiaryHeader";
import SearchFilterBar from "./SearchFilterBar";
import MoodAnalyticsCard from "./MoodAnalyticsCard";
import EntryCard from "./EntryCard";
import CalendarView from "./CalendarView";
import {
  DiarySkeletonTimeline,
  DiarySkeletonTree,
  DiarySkeletonCalendar,
} from "./DiarySkeleton";

function groupByMonth(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  return entries.reduce(
    (acc, e) => {
      const month = e.date.slice(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(e);
      return acc;
    },
    {} as Record<string, DiaryEntry[]>,
  );
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return `Tháng ${parseInt(mo)}/${y}`;
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

  const validEntries = entries.filter(
    (e) =>
      e.lat !== null &&
      e.lat !== undefined &&
      e.lng !== null &&
      e.lng !== undefined &&
      e.lat !== 0,
  ) as (DiaryEntry & { lat: number; lng: number })[];

  useEffect(() => {
    if (!mapRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    if (!document.querySelector('link[href*="leaflet"]'))
      document.head.appendChild(link);

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      if (mapInstanceRef.current) return;

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
      const mapTilerKey = "odL8F5mMYH7APbT24t4Q"; // Free MapTiler Key
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
      new MapStyleControl({ position: "bottomleft" }).addTo(map);
      mapInstanceRef.current = map;

      map.on("popupopen", (evt: any) => {
        const popupEl = evt.popup.getElement();
        if (!popupEl) return;
        const detailBtns = popupEl.querySelectorAll(".btn-view-diary-detail");
        detailBtns.forEach((btn: any) => {
          btn.onclick = () => {
            const id = btn.getAttribute("data-id");
            const target = entries.find((x) => x.id === id);
            if (target && onSelectEntryDetail) {
              onSelectEntryDetail(target);
            }
          };
        });
        const dirBtns = popupEl.querySelectorAll(".btn-directions");
        dirBtns.forEach((btn: any) => {
          btn.onclick = () => {
            const lat = btn.getAttribute("data-lat");
            const lng = btn.getAttribute("data-lng");
            if (lat && lng) {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                "_blank",
              );
            }
          };
        });
      });

      interface LocationGroup {
        lat: number;
        lng: number;
        entries: (DiaryEntry & { lat: number; lng: number })[];
      }
      const groupMap: Record<string, LocationGroup> = {};
      const locationGroups: LocationGroup[] = [];

      validEntries.forEach((e) => {
        const key = `${e.lat.toFixed(4)}_${e.lng.toFixed(4)}`;
        if (!groupMap[key]) {
          groupMap[key] = { lat: e.lat, lng: e.lng, entries: [] };
          locationGroups.push(groupMap[key]);
        }
        groupMap[key].entries.push(e);
      });

      locationGroups.forEach((group) => {
        const isMulti = group.entries.length > 1;
        const firstEntry = group.entries[0];
        const mood = MOOD_CONFIG[firstEntry.mood] || MOOD_CONFIG.neutral;
        const hex = isMulti ? "#06b6d4" : mood.hex;

        const marker = L.circleMarker([group.lat, group.lng], {
          radius: isMulti ? 13 : 10,
          fillColor: hex,
          color: "#ffffff",
          weight: isMulti ? 3.5 : 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        }).addTo(map);

        if (!isMulti) {
          const e = firstEntry;
          // Click vào marker đơn lẻ sẽ mở trực tiếp modal chi tiết
          marker.on("click", () => {
            if (onSelectEntryDetail) {
              onSelectEntryDetail(e);
            }
          });
        } else {
          const locName = firstEntry.location || "Vị trí này";
          const storiesHtml = group.entries
            .map((e) => {
              const eMood = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
              const eSnippet =
                e.content.length > 45
                  ? e.content.slice(0, 45) + "..."
                  : e.content;
              return `
              <div style="background:#f8fafc;padding:7px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:5px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:3px">
                  <span style="font-size:9px;font-weight:800;color:${eMood.hex};background:${eMood.hex}15;padding:2px 7px;border-radius:10px">
                    ${eMood.emoji} ${eMood.label}
                  </span>
                  <span style="font-size:8px;color:#94a3b8;font-weight:600">${e.date}</span>
                </div>
                <p style="font-size:10px;color:#334155;margin:0 0 5px 0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${eSnippet}</p>
                <button data-id="${e.id}" class="btn-view-diary-detail" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:3px;padding:4px 0;background:linear-gradient(to right,#06b6d4,#3b82f6);color:#fff;border:none;border-radius:7px;font-size:8px;font-weight:700;cursor:pointer">
                  <svg viewBox="0 0 24 24" width="10" height="10" style="fill:currentColor"><path d="${mdiEyeOutline}"/></svg>
                  Chi tiết
                </button>
              </div>
            `;
            })
            .join("");

          marker.bindPopup(`
            <div style="font-family:sans-serif;padding:4px;min-width:210px;max-width:260px;max-height:270px;overflow-y:auto">
              <div style="font-size:10.5px;font-weight:800;color:#0f172a;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">
                <span>📍 ${locName}</span>
                <span style="font-size:9px;background:#06b6d4;color:#fff;padding:2px 8px;border-radius:10px;font-weight:700">${group.entries.length} nhật ký</span>
              </div>
              <button data-lat="${firstEntry.lat}" data-lng="${firstEntry.lng}" class="btn-directions" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:3px;padding:5px 0;margin-bottom:5px;background:#fff;color:#3b82f6;border:1.5px solid #3b82f6;border-radius:8px;font-size:9px;font-weight:700;cursor:pointer">
                <svg viewBox="0 0 24 24" width="11" height="11" style="fill:currentColor"><path d="${mdiNavigation}"/></svg>
                Đường đi
              </button>
              <div>${storiesHtml}</div>
            </div>
          `);
        }

        markersRef.current.push(marker);
      });

      if (validEntries.length > 1) {
        const latLngs = validEntries.map((e) => [e.lat, e.lng]);
        L.polyline(latLngs as any, {
          color: "#06b6d4",
          weight: 2,
          opacity: 0.6,
          dashArray: "4 6",
        }).addTo(map);
        map.fitBounds(latLngs as any, { padding: [24, 24] });
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      if (!document.querySelector('script[src*="leaflet"]'))
        document.head.appendChild(script);
      else script.onload(null as any);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [entries.length]);

  if (validEntries.length === 0) {
    if (isFullScreen) {
      return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col w-screen h-screen">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer border border-slate-200/50 dark:border-slate-750"
            >
              <Icon path={mdiClose} size={0.7} />
              <span>Quay lại</span>
            </button>
            <div className="text-center">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Bản đồ nhật ký
              </h3>
              <p className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
                0 địa điểm
              </p>
            </div>
            <div className="w-[84px] invisible" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 min-w-0">
            <Icon
              path={mdiEarth}
              size={2}
              className="text-slate-300 animate-bounce"
            />
            <p className="text-sm font-semibold text-slate-400">
              Chưa có nhật ký có tọa độ
            </p>
            <p className="text-[10px] text-slate-400">
              Khi thêm nhật ký, ứng dụng tự động gắn vị trí vào bản đồ
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2 min-w-0">
        <Icon path={mdiEarth} size={2} className="mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">
          Chưa có nhật ký có tọa độ
        </p>
        <p className="text-[10px] text-slate-400">
          Khi thêm nhật ký, ứng dụng tự động gắn vị trí vào bản đồ
        </p>
      </div>
    );
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col w-screen h-screen">
        {/* Fullscreen Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer border border-slate-200/50 dark:border-slate-750"
          >
            <Icon path={mdiClose} size={0.7} />
            <span>Quay lại</span>
          </button>
          <div className="text-center">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Bản đồ nhật ký
            </h3>
            <p className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">
              {validEntries.length} địa điểm
            </p>
          </div>
          <div className="w-[84px] invisible" />{" "}
          {/* Spacer to balance header */}
        </div>

        {/* Map Area */}
        <div className="flex-1 w-full h-full relative min-h-0 min-w-0 z-0">
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div
        ref={mapRef}
        className="w-full rounded-[20px] overflow-hidden border border-slate-100 dark:border-slate-700"
        style={{ height: 360 }}
      />
      <div className="mt-2 flex flex-wrap gap-1.5 min-w-0">
        {validEntries.map((e) => {
          const m = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
          return (
            <div
              key={e.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-bold ${m.bg} ${m.color}`}
            >
              <Icon path={m.icon} size={0.6} />
              {e.date.slice(5)} {e.location || ""}
            </div>
          );
        })}
      </div>
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
  const [viewMode, setViewMode] = useState<DiaryViewMode>("timeline");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<DiaryEntry | null>(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<DiaryMood | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [calendarMonth, setCalendarMonth] = useState(getLocalMonthString());

  // Form state
  const [date, setDate] = useState(getLocalDateString());
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<DiaryMood>("neutral");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Location search state
  const [locSearchResults, setLocSearchResults] = useState<any[]>([]);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [selectedLocName, setSelectedLocName] = useState("");

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const dragControlsDetail = useDragControls();
  const dragControlsForm = useDragControls();

  // Tree expanded months
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    new Set([getLocalMonthString()]),
  );

  const filteredEntries = getFilteredEntries(
    search,
    selectedMood,
    "",
    null,
    sort,
  );
  const grouped = groupByMonth(filteredEntries);
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setLocSearchResults([]);
      return;
    }
    setIsSearchingLoc(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      );
      const data = await res.json();
      setLocSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingLoc(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (location.trim() && location !== selectedLocName) {
        searchLocation(location);
      } else if (!location.trim()) {
        setLocSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location, selectedLocName]);

  const handleSelectLocation = (item: any) => {
    const name = item.display_name;
    const latitude = item.lat;
    const longitude = item.lon;
    setLocation(name);
    setSelectedLocName(name);
    setLat(String(parseFloat(latitude).toFixed(5)));
    setLng(String(parseFloat(longitude).toFixed(5)));
    setLocSearchResults([]);
  };

  const fetchCurrentLocation = useCallback((autoFillLocationText = true) => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(String(latitude.toFixed(5)));
        setLng(String(longitude.toFixed(5)));
        setIsGettingLocation(false);

        if (autoFillLocationText) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            );
            const data = await res.json();
            if (data && data.address) {
              const a = data.address;
              const parts = [];
              const place =
                a.amenity || a.shop || a.building || a.tourism || a.road;
              const area =
                a.suburb ||
                a.quarter ||
                a.neighbourhood ||
                a.ward ||
                a.city_district;
              const city = a.city || a.town || a.county || a.state;
              if (place) parts.push(place);
              if (area) parts.push(area);
              if (city) parts.push(city);
              const addrStr =
                parts.length > 0 ? parts.join(", ") : data.display_name || "";
              if (addrStr)
                setLocation((prev) => (prev.trim() ? prev : addrStr));
            }
          } catch (e) {}
        }
      },
      () => setIsGettingLocation(false),
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    fetchCurrentLocation(true);
  }, [fetchCurrentLocation]);

  const resetForm = () => {
    setDate(getLocalDateString());
    setContent("");
    setMood("neutral");
    setLocation("");
    setLat("");
    setLng("");
    setTags("");
    setEditId(null);
    setLocSearchResults([]);
    setSelectedLocName("");
    fetchCurrentLocation(true);
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditId(entry.id);
    setDate(entry.date);
    setContent(entry.content);
    setMood(entry.mood);
    const loc = entry.location || "";
    setLocation(loc);
    setSelectedLocName(loc);
    setLat(
      entry.lat !== null && entry.lat !== undefined ? String(entry.lat) : "",
    );
    setLng(
      entry.lng !== null && entry.lng !== undefined ? String(entry.lng) : "",
    );
    setTags((entry.tags || []).join(", "));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Nhập nội dung nhật ký!");
      return;
    }
    setIsSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        date,
        content: content.trim(),
        mood,
        location: location.trim(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        tags: tagList,
      };
      if (editId) {
        await updateEntry(editId, payload);
        toast.success("Đã cập nhật nhật ký!");
      } else {
        await addEntry(payload);
        toast.success("Đã thêm nhật ký!");
      }
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || "Lỗi");
    } finally {
      setIsSaving(false);
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
          <p className="text-sm font-bold text-slate-800">Xóa nhật ký này?</p>
          <p className="text-xs text-slate-500">
            Không thể khôi phục sau khi xóa.
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
                  toast.success("Đã xóa!");
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
    setViewMode("timeline");
  };

  const currentTimeStr = new Date().toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const renderTimeline = () => (
    <div className="space-y-3 min-w-0">
      {filteredEntries.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2">
          <Icon
            path={mdiBookOpenVariant}
            size={2}
            className="mx-auto text-slate-300"
          />
          <p className="text-sm font-semibold text-slate-400">
            {search ? "Không tìm thấy nhật ký nào" : "Chưa có nhật ký nào"}
          </p>
          <p className="text-[10px] text-slate-400">
            {search
              ? "Thử thay đổi từ khóa hoặc bộ lọc"
              : 'Nhấn "Viết nhật ký" để viết nhật ký đầu tiên'}
          </p>
        </div>
      ) : (
        filteredEntries.map((e, i) => (
          <EntryCard
            key={e.id}
            entry={e}
            index={i}
            onEdit={openEdit}
            onDelete={handleDelete}
            onPin={pinEntry}
            onViewDetail={setDetailEntry}
          />
        ))
      )}
    </div>
  );

  const renderTree = () => (
    <div className="space-y-3 min-w-0">
      {months.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2">
          <Icon
            path={mdiBookOpenVariant}
            size={2}
            className="mx-auto text-slate-300"
          />
          <p className="text-sm font-semibold text-slate-400">
            Chưa có nhật ký
          </p>
        </div>
      ) : (
        months.map((month) => {
          const isExp = expandedMonths.has(month);
          const list = grouped[month];
          return (
            <div
              key={month}
              className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden shadow-sm min-w-0"
            >
              <button
                onClick={() => {
                  const n = new Set(expandedMonths);
                  if (n.has(month)) n.delete(month);
                  else n.add(month);
                  setExpandedMonths(n);
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    path={isExp ? mdiChevronDown : mdiChevronRight}
                    size={0.875}
                    className="text-slate-400"
                  />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase">
                    {formatMonth(month)}
                  </span>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">
                    {list.length} bài
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {isExp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="space-y-2">
                      {list.map((entry) => {
                        const m =
                          MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 hover:border-slate-200"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`p-1 rounded-lg ${m.bg} ${m.color}`}
                              >
                                <Icon path={m.icon} size={0.667} />
                              </span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate block">
                                  {entry.content.slice(0, 40)}
                                  {entry.content.length > 40 ? "..." : ""}
                                </span>
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  {entry.date}{" "}
                                  {entry.location ? `• ${entry.location}` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(entry)}
                                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <Icon path={mdiPencil} size={0.6} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 cursor-pointer"
                              >
                                <Icon path={mdiDeleteOutline} size={0.6} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}
    </div>
  );

  const renderSkeleton = () => {
    switch (viewMode) {
      case "timeline":
        return <DiarySkeletonTimeline />;
      case "tree":
        return <DiarySkeletonTree />;
      case "calendar":
        return <DiarySkeletonCalendar />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case "timeline":
        return renderTimeline();
      case "tree":
        return renderTree();
      case "map":
        return (
          <LeafletMap
            entries={filteredEntries}
            onSelectEntryDetail={setDetailEntry}
            isFullScreen={true}
            onBack={() => setViewMode("timeline")}
          />
        );
      case "calendar":
        return (
          <CalendarView
            entries={entries}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelectDate={handleSelectCalendarDate}
          />
        );
    }
  };

  return (
    <div className="space-y-5 pb-40 min-w-0 max-w-full overflow-x-hidden">
      {/* 3D Parallax Header */}
      <DiaryHeader streakData={streakData} totalEntries={entries.length} />

      {/* Mood Analytics */}
      <MoodAnalyticsCard stats={moodStats} totalEntries={entries.length} />

      {/* Search & Filter */}
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

      {/* View mode switcher */}
      <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm min-w-0">
        {[
          {
            key: "timeline",
            label: "Dòng thời gian",
            icon: mdiFormatListBulleted,
          },
          { key: "tree", label: "Cây thư mục", icon: mdiChevronRight },
          { key: "map", label: "Bản đồ", icon: mdiMap },
          { key: "calendar", label: "Lịch", icon: mdiCalendarMonth },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setViewMode(v.key as DiaryViewMode)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              viewMode === v.key
                ? "bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Icon path={v.icon} size={0.75} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92, rotate: 15 }}
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="fixed bottom-[120px] right-5 md:right-[calc(50%-12.75rem)] z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] text-white shadow-[0_8px_24px_rgba(6,182,212,0.4)] flex items-center justify-center cursor-pointer"
      >
        <Icon path={mdiPlus} size={1.25} />
      </motion.button>

      {/* Content */}
      {loading ? renderSkeleton() : renderContent()}

      {/* Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {detailEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-50 bg-slate-900/50 backdrop-blur-md flex items-end justify-center"
              onClick={() => {
                setDetailEntry(null);
                setReplyText("");
              }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                drag="y"
                dragControls={dragControlsDetail}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 200) {
                    setDetailEntry(null);
                    setReplyText("");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10 min-w-0"
              >
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControlsDetail.start(e);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{ touchAction: "none" }}
                  className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                >
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 space-y-4 min-w-0">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${MOOD_CONFIG[detailEntry.mood]?.bg} ${MOOD_CONFIG[detailEntry.mood]?.color}`}
                    >
                      <Icon
                        path={
                          MOOD_CONFIG[detailEntry.mood]?.icon ||
                          mdiBookOpenVariant
                        }
                        size={0.7}
                      />
                      <span>{MOOD_CONFIG[detailEntry.mood]?.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {formatDate(detailEntry.date)}
                    </span>
                  </div>
                  {detailEntry.location && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      <Icon path={mdiMapMarker} size={0.75} />
                      <span>{detailEntry.location}</span>
                    </div>
                  )}
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 break-words">
                    {detailEntry.content}
                  </div>
                  {(detailEntry.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {detailEntry.tags.map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1"
                        >
                          <Icon path={mdiTag} size={0.5} />#{t}
                        </span>
                      ))}
                    </div>
                  )}
                  {(detailEntry.replies || []).length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Phản hồi ({detailEntry.replies?.length})
                      </span>
                      <div className="space-y-2">
                        {detailEntry.replies?.map((r) => (
                          <div
                            key={r.id}
                            className="bg-cyan-50/60 dark:bg-slate-800/80 border border-cyan-100 dark:border-slate-700 p-3 rounded-2xl space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-cyan-700 dark:text-cyan-400 font-bold">
                              <span>💬 Trả lời</span>
                              <span className="text-slate-400 font-normal">
                                {r.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                              {r.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Trả lời nhật ký
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                        ⏱ {currentTimeStr}
                      </span>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      placeholder="Nhập suy nghĩ / phản hồi..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-medium outline-none dark:text-white resize-none min-w-0"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleSaveReply}
                        disabled={isSavingReply || !replyText.trim()}
                        className="bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {isSavingReply ? (
                          <Icon
                            path={mdiLoading}
                            size={0.6}
                            className="animate-spin"
                          />
                        ) : (
                          <Icon path={mdiPlus} size={0.6} />
                        )}
                        {isSavingReply ? "Đang lưu..." : "Lưu trả lời"}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setDetailEntry(null);
                        setReplyText("");
                      }}
                      className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Form Modal */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-50 bg-slate-900/50 backdrop-blur-md flex items-end justify-center"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                drag="y"
                dragControls={dragControlsForm}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 200)
                    setShowForm(false);
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.15)] z-10 min-w-0"
              >
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControlsForm.start(e);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{ touchAction: "none" }}
                  className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                >
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-slate-800 dark:text-white">
                      {editId ? "Sửa nhật ký" : "Viết nhật ký"}
                    </h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                    >
                      <Icon path={mdiClose} size={0.875} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 pt-2 space-y-4 min-w-0">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Ngày
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-2.5 text-sm font-semibold outline-none dark:text-white min-w-0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                      Tâm trạng
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 min-w-0">
                      {(
                        Object.entries(MOOD_CONFIG) as [
                          DiaryMood,
                          (typeof MOOD_CONFIG)[DiaryMood],
                        ][]
                      ).map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setMood(k)}
                          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer min-w-0 ${
                            mood === k
                              ? `border-current ${v.bg} ${v.color}`
                              : "border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200"
                          }`}
                        >
                          <Icon path={v.icon} size={0.9} />
                          <span className="text-[9px] font-bold truncate w-full text-center">
                            {v.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Nội dung *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={5}
                      placeholder="Hôm nay tôi cảm thấy..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-3 text-sm font-medium outline-none resize-none dark:text-white leading-relaxed min-w-0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Địa điểm
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Icon
                          path={mdiMapMarker}
                          size={0.875}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Nhập tên địa điểm để tự động tìm tọa độ..."
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white min-w-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          fetchCurrentLocation(true);
                          toast.success("Đang định vị...");
                        }}
                        disabled={isGettingLocation}
                        className="shrink-0 text-[10px] font-bold px-3 py-2.5 bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white rounded-[16px] cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Icon
                          path={isGettingLocation ? mdiLoading : mdiMapMarker}
                          size={0.6}
                          className={isGettingLocation ? "animate-spin" : ""}
                        />
                        {isGettingLocation ? "Đang lấy..." : "Vị trí"}
                      </button>
                    </div>

                    {isSearchingLoc && (
                      <div className="mt-1.5 text-[10px] text-slate-400 font-bold flex items-center gap-1 px-1">
                        <Icon
                          path={mdiLoading}
                          size={0.5}
                          className="animate-spin"
                        />
                        Đang tìm kiếm vị trí...
                      </div>
                    )}

                    {locSearchResults.length > 0 && (
                      <div className="mt-2 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-2xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 z-20 relative">
                        {locSearchResults.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectLocation(item)}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex flex-col gap-0.5"
                          >
                            <span className="truncate">
                              {item.display_name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Tọa độ: {parseFloat(item.lat).toFixed(5)},{" "}
                              {parseFloat(item.lon).toFixed(5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(lat || lng) && (
                      <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                        <span>
                          📍 Tọa độ: {lat || "0"}, {lng || "0"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLat("");
                            setLng("");
                            toast.success("Đã xóa tọa độ");
                          }}
                          className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase"
                        >
                          Xóa tọa độ
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Tags (phân cách bằng dấu phẩy)
                    </label>
                    <div className="relative">
                      <Icon
                        path={mdiTag}
                        size={0.875}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="VD: du lịch, gia đình, công việc"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white min-w-0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="w-full mt-6 bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white font-black text-sm py-4 rounded-[20px] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Icon
                        path={mdiLoading}
                        size={0.875}
                        className="animate-spin"
                      />
                    ) : null}
                    {isSaving
                      ? "Đang lưu..."
                      : editId
                        ? "Cập nhật nhật ký"
                        : "Lưu nhật ký"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
