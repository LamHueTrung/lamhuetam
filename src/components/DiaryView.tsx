import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiPlus, mdiClose, mdiDeleteOutline, mdiPencil,
  mdiMapMarker, mdiCalendar, mdiTag, mdiChevronDown, mdiChevronRight,
  mdiEmoticonHappyOutline, mdiEmoticonSadOutline, mdiEmoticonNeutralOutline,
  mdiStar, mdiWeatherLightning, mdiHeart, mdiHandsPray, mdiLoading,
  mdiFormatListBulleted, mdiMap, mdiEarth, mdiMagnify,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { DiaryEntry, DiaryMood } from "../types";
import { useDiary } from "../hooks/useDiary";

const MOOD_CONFIG: Record<DiaryMood, { icon: string; label: string; color: string; bg: string; hex: string }> = {
  positive: { icon: mdiEmoticonHappyOutline, label: 'Tích cực', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', hex: '#10b981' },
  excited: { icon: mdiStar, label: 'Phấn khích', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800', hex: '#eab308' },
  grateful: { icon: mdiHandsPray, label: 'Biết ơn', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800', hex: '#06b6d4' },
  neutral: { icon: mdiEmoticonNeutralOutline, label: 'Trung hòa', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', hex: '#64748b' },
  sad: { icon: mdiEmoticonSadOutline, label: 'Buồn', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', hex: '#3b82f6' },
  angry: { icon: mdiWeatherLightning, label: 'Tức giận', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800', hex: '#ef4444' },
  negative: { icon: mdiHeart, label: 'Tiêu cực', color: 'text-rose-400', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800', hex: '#f43f5e' },
};

function groupByMonth(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  return entries.reduce((acc, e) => {
    const month = e.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(e);
    return acc;
  }, {} as Record<string, DiaryEntry[]>);
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return `Tháng ${parseInt(mo)}/${y}`;
}

// Leaflet map rendered into a div with useEffect
function LeafletMap({ entries, onSelectEntryDetail }: { entries: DiaryEntry[]; onSelectEntryDetail: (entry: DiaryEntry) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const validEntries = entries.filter(e => e.lat !== null && e.lat !== undefined && e.lng !== null && e.lng !== undefined && e.lat !== 0) as (DiaryEntry & { lat: number; lng: number })[];

  useEffect(() => {
    if (!mapRef.current) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    if (!document.querySelector('link[href*="leaflet"]')) document.head.appendChild(link);

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      if (mapInstanceRef.current) return;

      const center: [number, number] = validEntries.length > 0 ? [validEntries[0].lat, validEntries[0].lng] : [16.047, 108.206];
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
      mapInstanceRef.current = map;

      // Handle custom event from Leaflet popup button
      map.on('popupopen', (evt: any) => {
        const popupEl = evt.popup.getElement();
        if (!popupEl) return;
        const btn = popupEl.querySelector('.btn-view-diary-detail');
        if (btn) {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const target = entries.find(x => x.id === id);
            if (target && onSelectEntryDetail) {
              onSelectEntryDetail(target);
            }
          };
        }
      });

      validEntries.forEach(e => {
        const mood = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
        const hex = mood.hex;
        const marker = L.circleMarker([e.lat, e.lng], {
          radius: 9,
          fillColor: hex,
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        const snippet = e.content.length > 50 ? e.content.slice(0, 50) + '...' : e.content;

        marker.bindPopup(`
          <div style="font-family:sans-serif;padding:4px;min-width:160px;max-width:210px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
              <span style="font-size:10px;font-weight:700;color:${hex};background:${hex}18;padding:2px 8px;border-radius:12px;border:1px solid ${hex}40">
                ${mood.label}
              </span>
              <span style="font-size:10px;color:#94a3b8;font-weight:600">${e.date}</span>
            </div>
            ${e.location ? `<div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:6px">📍 ${e.location}</div>` : ''}
            <p style="font-size:11px;color:#334155;margin:0 0 8px 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${snippet}</p>
            <button data-id="${e.id}" class="btn-view-diary-detail" style="width:100%;padding:6px 0;background:linear-gradient(to right, #06b6d4, #3b82f6);color:#fff;border:none;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer">
              Xem chi tiết
            </button>
          </div>
        `);
        markersRef.current.push(marker);
      });

      if (validEntries.length > 1) {
        const latLngs = validEntries.map(e => [e.lat, e.lng]);
        L.polyline(latLngs as any, { color: '#06b6d4', weight: 2, opacity: 0.6, dashArray: '4 6' }).addTo(map);
        map.fitBounds(latLngs as any, { padding: [24, 24] });
      }
    };

    if ((window as any).L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      if (!document.querySelector('script[src*="leaflet"]')) document.head.appendChild(script);
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
    return (
      <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2 min-w-0">
        <Icon path={mdiEarth} size={2} className="mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký có tọa độ</p>
        <p className="text-[10px] text-slate-400">Khi thêm nhật ký, ứng dụng tự động gắn vị trí vào bản đồ</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full overflow-x-hidden">
      <div ref={mapRef} className="w-full rounded-[20px] overflow-hidden border border-slate-100 dark:border-slate-700" style={{ height: 360 }} />
      <div className="mt-2 flex flex-wrap gap-1.5 min-w-0">
        {validEntries.map(e => {
          const m = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
          return (
            <div key={e.id} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-bold ${m.bg} ${m.color}`}>
              <Icon path={m.icon} size={0.6} />{e.date.slice(5)} {e.location || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DiaryView() {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useDiary();
  const [viewMode, setViewMode] = useState<'timeline' | 'tree' | 'map'>('timeline');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<DiaryEntry | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood>('neutral');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Tree expanded months
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([new Date().toISOString().slice(0, 7)]));

  // Geolocation & Reverse Geocoding helper
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
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.address) {
              const a = data.address;
              const parts = [];
              const place = a.amenity || a.shop || a.building || a.tourism || a.road;
              const area = a.suburb || a.quarter || a.neighbourhood || a.ward || a.city_district;
              const city = a.city || a.town || a.county || a.state;
              if (place) parts.push(place);
              if (area) parts.push(area);
              if (city) parts.push(city);
              const addrStr = parts.length > 0 ? parts.join(', ') : (data.display_name || '');
              if (addrStr) {
                setLocation(prev => prev.trim() ? prev : addrStr);
              }
            }
          } catch (e) {}
        }
      },
      () => setIsGettingLocation(false),
      { timeout: 8000 }
    );
  }, []);

  // Auto-request location when opening Diary tab
  useEffect(() => {
    fetchCurrentLocation(true);
  }, [fetchCurrentLocation]);

  const grouped = groupByMonth(entries);
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setContent('');
    setMood('neutral');
    setLocation('');
    setLat('');
    setLng('');
    setTags('');
    setEditId(null);
    fetchCurrentLocation(true);
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditId(entry.id);
    setDate(entry.date);
    setContent(entry.content);
    setMood(entry.mood);
    setLocation(entry.location || '');
    setLat(entry.lat !== null && entry.lat !== undefined ? String(entry.lat) : '');
    setLng(entry.lng !== null && entry.lng !== undefined ? String(entry.lng) : '');
    setTags((entry.tags || []).join(', '));
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error('Nhập nội dung nhật ký!'); return; }
    setIsSaving(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        date, content: content.trim(), mood,
        location: location.trim(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        tags: tagList,
      };
      if (editId) {
        await updateEntry(editId, payload);
        toast.success('Đã cập nhật nhật ký!');
      } else {
        await addEntry(payload);
        toast.success('Đã thêm nhật ký!');
      }
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Lỗi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-slate-800">Xóa nhật ký này?</p>
        <p className="text-xs text-slate-500">Không thể khôi phục sau khi xóa.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer">Hủy</button>
          <button onClick={async () => { toast.dismiss(t.id); try { await deleteEntry(id); toast.success('Đã xóa!'); } catch (e: any) { toast.error(e.message); } }} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer">Xóa</button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const moodStats = Object.entries(MOOD_CONFIG).map(([k, v]) => ({
    mood: k as DiaryMood,
    ...v,
    count: entries.filter(e => e.mood === k).length,
  })).filter(m => m.count > 0);

  // ── Entry Card ──────────────────────────────────────────────────────────
  const EntryCard = ({ entry }: { entry: DiaryEntry }) => {
    const m = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`border rounded-[20px] p-4 space-y-2.5 ${m.bg} min-w-0`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${m.color}`}>
              <Icon path={m.icon} size={0.875} />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">{formatDate(entry.date)}</span>
              {entry.location && <span className="text-[10px] text-slate-400 font-medium truncate block">📍 {entry.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openEdit(entry)} className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-400 cursor-pointer transition-all">
              <Icon path={mdiPencil} size={0.667} />
            </button>
            <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-full hover:bg-rose-100 text-slate-300 hover:text-rose-500 cursor-pointer transition-all">
              <Icon path={mdiDeleteOutline} size={0.667} />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap break-words">{entry.content}</p>

        {(entry.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.tags.map((t, i) => (
              <span key={i} className="text-[9px] font-bold text-slate-400 bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // ── Render Views ────────────────────────────────────────────────────────
  const renderTimeline = () => (
    <div className="space-y-3 min-w-0">
      {entries.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2">
          <Icon path={mdiBookOpenVariant} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký nào</p>
          <p className="text-[10px] text-slate-400">Nhấn "Viết nhật ký" để viết nhật ký đầu tiên</p>
        </div>
      ) : (
        entries.map(e => <EntryCard key={e.id} entry={e} />)
      )}
    </div>
  );

  const renderTree = () => (
    <div className="space-y-3 min-w-0">
      {months.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2">
          <Icon path={mdiBookOpenVariant} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký</p>
        </div>
      ) : (
        months.map(month => {
          const isExp = expandedMonths.has(month);
          const list = grouped[month];
          return (
            <div key={month} className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden shadow-sm min-w-0">
              <button onClick={() => {
                const n = new Set(expandedMonths);
                if (n.has(month)) n.delete(month); else n.add(month);
                setExpandedMonths(n);
              }}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <Icon path={isExp ? mdiChevronDown : mdiChevronRight} size={0.875} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase">{formatMonth(month)}</span>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">{list.length} bài</span>
                </div>
              </button>

              <AnimatePresence>
                {isExp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="space-y-2">
                      {list.map(entry => {
                        const m = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 hover:border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`p-1 rounded-lg ${m.bg} ${m.color}`}>
                                <Icon path={m.icon} size={0.667} />
                              </span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate block">{entry.content.slice(0, 40)}{entry.content.length > 40 ? '...' : ''}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">{entry.date} {entry.location ? `• ${entry.location}` : ''}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEdit(entry)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <Icon path={mdiPencil} size={0.6} />
                              </button>
                              <button onClick={() => handleDelete(entry.id)} className="p-1 text-slate-300 hover:text-rose-500 cursor-pointer">
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

  // ── MAIN RENDER ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-40 min-w-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">CUỘC SỐNG</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Nhật Ký Đời Tôi</h1>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] text-white font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-lg flex items-center gap-1.5">
          <Icon path={mdiPlus} size={0.875} /><span>Viết nhật ký</span>
        </button>
      </div>

      {/* Mood stats */}
      {moodStats.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Tổng quan cảm xúc ({entries.length} bài)</span>
          <div className="flex flex-wrap gap-2 min-w-0">
            {moodStats.map(m => (
              <div key={m.mood} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${m.bg} ${m.color}`}>
                <Icon path={m.icon} size={0.667} />
                <span>{m.label}</span>
                <span className="bg-white/60 dark:bg-black/20 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-black">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View mode switcher */}
      <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm min-w-0">
        {[
          { key: 'timeline', label: 'Timeline', icon: mdiFormatListBulleted },
          { key: 'tree', label: 'Cây thư mục', icon: mdiChevronRight },
          { key: 'map', label: 'Bản đồ', icon: mdiMap },
        ].map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key as any)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${viewMode === v.key ? 'bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <Icon path={v.icon} size={0.75} />{v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Icon path={mdiLoading} size={1.5} className="text-slate-300 animate-spin" /></div>
      ) : viewMode === 'timeline' ? renderTimeline() : viewMode === 'tree' ? renderTree() : (
        <div className="space-y-3 min-w-0">
          <LeafletMap entries={entries} onSelectEntryDetail={setDetailEntry} />
        </div>
      )}

      {/* Full Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {detailEntry && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setDetailEntry(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[28px] p-6 max-h-[85vh] overflow-y-auto overflow-x-hidden shadow-2xl space-y-4 min-w-0">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${MOOD_CONFIG[detailEntry.mood]?.bg} ${MOOD_CONFIG[detailEntry.mood]?.color}`}>
                      <Icon path={MOOD_CONFIG[detailEntry.mood]?.icon || mdiEmoticonNeutralOutline} size={0.7} />
                      <span>{MOOD_CONFIG[detailEntry.mood]?.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{formatDate(detailEntry.date)}</span>
                  </div>
                  <button onClick={() => setDetailEntry(null)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"><Icon path={mdiClose} size={1} /></button>
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
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {detailEntry.tags.map((t, i) => (
                      <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Icon path={mdiTag} size={0.5} />#{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { const e = detailEntry; setDetailEntry(null); openEdit(e); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer">
                    <Icon path={mdiPencil} size={0.7} />Sửa
                  </button>
                  <button onClick={() => setDetailEntry(null)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white font-bold text-xs hover:opacity-90 cursor-pointer">
                    Đóng
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add/Edit form modal */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-end justify-center"
              onClick={() => setShowForm(false)}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.15)] z-10 min-w-0">

                {/* Handle */}
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-white">{editId ? 'Sửa nhật ký' : 'Viết nhật ký'}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"><Icon path={mdiClose} size={1} /></button>
                </div>

                <div className="space-y-4 min-w-0">
                  {/* Date */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Ngày</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-2.5 text-sm font-semibold outline-none dark:text-white min-w-0" />
                  </div>

                  {/* Mood picker */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Tâm trạng</label>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 min-w-0">
                      {(Object.entries(MOOD_CONFIG) as [DiaryMood, typeof MOOD_CONFIG[DiaryMood]][]).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => setMood(k)}
                          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl border-2 transition-all cursor-pointer min-w-0 ${mood === k ? `border-current ${v.bg} ${v.color}` : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'}`}>
                          <Icon path={v.icon} size={0.9} />
                          <span className="text-[9px] font-bold truncate w-full text-center">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nội dung *</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Hôm nay tôi cảm thấy..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-3 text-sm font-medium outline-none resize-none dark:text-white leading-relaxed min-w-0" />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Địa điểm</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Icon path={mdiMapMarker} size={0.875} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Tự động điền địa chỉ hoặc nhập thủ công..."
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white min-w-0" />
                      </div>
                      <button type="button"
                        onClick={() => {
                          fetchCurrentLocation(true);
                          toast.success('Đang định vị và tự động điền địa chỉ...');
                        }}
                        disabled={isGettingLocation}
                        className="shrink-0 text-[10px] font-bold px-3 py-2.5 bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white rounded-[16px] cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                        <Icon path={isGettingLocation ? mdiLoading : mdiMapMarker} size={0.6} className={isGettingLocation ? 'animate-spin' : ''} />
                        {isGettingLocation ? 'Đang lấy...' : 'Vị trí'}
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Tags (phân cách bằng dấu phẩy)</label>
                    <div className="relative">
                      <Icon path={mdiTag} size={0.875} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="VD: du lịch, gia đình, công việc"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white min-w-0" />
                    </div>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={isSaving}
                  className="w-full mt-6 bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white font-black text-sm py-4 rounded-[20px] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2">
                  {isSaving ? <Icon path={mdiLoading} size={0.875} className="animate-spin" /> : null}
                  {isSaving ? 'Đang lưu...' : (editId ? 'Cập nhật nhật ký' : 'Lưu nhật ký')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
