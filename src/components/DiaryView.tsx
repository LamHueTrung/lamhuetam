import React, { useState, useEffect, useRef } from "react";
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

const MOOD_CONFIG: Record<DiaryMood, { icon: string; label: string; color: string; bg: string }> = {
  positive: { icon: mdiEmoticonHappyOutline, label: 'Tích cực', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' },
  excited: { icon: mdiStar, label: 'Phấn khích', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' },
  grateful: { icon: mdiHandsPray, label: 'Biết ơn', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' },
  neutral: { icon: mdiEmoticonNeutralOutline, label: 'Trung hòa', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' },
  sad: { icon: mdiEmoticonSadOutline, label: 'Buồn', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  angry: { icon: mdiWeatherLightning, label: 'Tức giận', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' },
  negative: { icon: mdiHeart, label: 'Tiêu cực', color: 'text-rose-400', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800' },
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

interface MapEntry {
  entry: DiaryEntry;
  lat: number;
  lng: number;
}

// Leaflet map rendered into a div with useEffect
function LeafletMap({ entries }: { entries: DiaryEntry[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const validEntries = entries.filter(e => e.lat !== null && e.lat !== undefined && e.lng !== null && e.lng !== undefined && e.lat !== 0) as (DiaryEntry & { lat: number; lng: number })[];

  useEffect(() => {
    if (!mapRef.current) return;
    // Load leaflet dynamically from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    if (!document.querySelector('link[href*="leaflet"]')) document.head.appendChild(link);

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      if (mapInstanceRef.current) return; // already initialized

      const center: [number, number] = validEntries.length > 0 ? [validEntries[0].lat, validEntries[0].lng] : [16.047, 108.206];
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
      mapInstanceRef.current = map;

      validEntries.forEach(e => {
        const mood = MOOD_CONFIG[e.mood] || MOOD_CONFIG.neutral;
        const marker = L.circleMarker([e.lat, e.lng], {
          radius: 8, fillColor: e.mood === 'positive' ? '#10b981' : e.mood === 'sad' ? '#3b82f6' : e.mood === 'angry' ? '#ef4444' : '#64748b',
          color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85,
        }).addTo(map);
        marker.bindPopup(`<div style="font-family:sans-serif;min-width:120px"><b style="font-size:11px">${e.date}</b><br/><span style="font-size:10px;color:#64748b">${mood.label}</span><br/><p style="font-size:11px;margin:4px 0 0">${e.content.slice(0, 80)}${e.content.length > 80 ? '...' : ''}</p>${e.location ? `<p style="font-size:9px;color:#94a3b8;margin:2px 0 0">📍 ${e.location}</p>` : ''}</div>`);
        markersRef.current.push(marker);
      });

      if (validEntries.length > 1) {
        const latLngs = validEntries.map(e => [e.lat, e.lng]);
        L.polyline(latLngs as any, { color: '#64748b', weight: 1.5, opacity: 0.4, dashArray: '4 6' }).addTo(map);
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
      else script.onload(null as any); // already loading
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
      <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-2">
        <Icon path={mdiEarth} size={2} className="mx-auto text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký có tọa độ</p>
        <p className="text-[10px] text-slate-400">Khi thêm nhật ký, nhập vĩ độ/kinh độ để hiển thị trên bản đồ</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} className="w-full rounded-[20px] overflow-hidden border border-slate-100 dark:border-slate-700" style={{ height: 360 }} />
      <div className="mt-2 flex flex-wrap gap-1.5">
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

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood>('neutral');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Tree expanded months
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([new Date().toISOString().slice(0, 7)]));

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
  };

  const openEdit = (entry: DiaryEntry) => {
    setEditId(entry.id);
    setDate(entry.date);
    setContent(entry.content);
    setMood(entry.mood);
    setLocation(entry.location || '');
    setLat(entry.lat !== null ? String(entry.lat) : '');
    setLng(entry.lng !== null ? String(entry.lng) : '');
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
    if (!confirm('Xóa nhật ký này?')) return;
    try { await deleteEntry(id); toast.success('Đã xóa!'); } catch (e: any) { toast.error(e.message); }
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
        className={`border rounded-[20px] p-4 space-y-2.5 ${m.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-xl bg-white/60 dark:bg-black/20 ${m.color}`}>
              <Icon path={m.icon} size={0.875} />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider ${m.color}`}>{m.label}</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{formatDate(entry.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openEdit(entry)} className="p-1.5 rounded-full hover:bg-white/60 text-slate-400 cursor-pointer transition-all">
              <Icon path={mdiPencil} size={0.667} />
            </button>
            <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-full hover:bg-rose-100 text-slate-300 hover:text-rose-500 cursor-pointer transition-all">
              <Icon path={mdiDeleteOutline} size={0.667} />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{entry.content}</p>
        {entry.location && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Icon path={mdiMapMarker} size={0.6} />
            <span>{entry.location}</span>
            {entry.lat && entry.lng && <span className="opacity-60">({entry.lat.toFixed(4)}, {entry.lng.toFixed(4)})</span>}
          </div>
        )}
        {(entry.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((t, i) => (
              <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-slate-500"># {t}</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // ── Render timeline view ────────────────────────────────────────────────
  const renderTimeline = () => (
    <div className="space-y-6">
      {months.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[28px] p-10 text-center space-y-3">
          <Icon path={mdiCalendar} size={2.5} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký nào</p>
          <p className="text-[10px] text-slate-400">Nhấn dấu + để viết nhật ký đầu tiên</p>
        </div>
      ) : months.map(month => (
        <div key={month}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">{formatMonth(month)}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-3 relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200/60 dark:bg-slate-700/60" />
            {grouped[month].map(entry => (
              <div key={entry.id} className="pl-7 relative">
                <div className={`absolute left-1.5 top-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${MOOD_CONFIG[entry.mood]?.color.replace('text-', 'bg-') || 'bg-slate-400'}`} />
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Render tree view ────────────────────────────────────────────────────
  const renderTree = () => (
    <div className="space-y-2">
      {months.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[28px] p-10 text-center space-y-3">
          <Icon path={mdiCalendar} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa có nhật ký</p>
        </div>
      ) : months.map(month => {
        const isOpen = expandedMonths.has(month);
        return (
          <div key={month} className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden">
            <button onClick={() => setExpandedMonths(prev => { const next = new Set(prev); isOpen ? next.delete(month) : next.add(month); return next; })}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <Icon path={isOpen ? mdiChevronDown : mdiChevronRight} size={0.875} className="text-slate-400" />
                <div>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-white">{formatMonth(month)}</span>
                  <span className="text-[10px] text-slate-400 font-medium ml-2">{grouped[month].length} bài</span>
                </div>
              </div>
              <div className="flex gap-1">
                {Object.entries(MOOD_CONFIG).filter(([k]) => grouped[month].some(e => e.mood === k)).map(([k, v]) => (
                  <div key={k} className={`w-5 h-5 rounded-full flex items-center justify-center ${v.bg} ${v.color}`} title={v.label}>
                    <Icon path={v.icon} size={0.5} />
                  </div>
                ))}
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 dark:border-slate-700">
                    {grouped[month].map(entry => {
                      const m = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;
                      return (
                        <div key={entry.id} className="flex items-start gap-3 pt-3">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5 ${m.color} bg-white dark:bg-slate-700 border ${m.bg}`}>
                            <Icon path={m.icon} size={0.55} />
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(entry)}>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{new Date(entry.date + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}</p>
                            <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{entry.content}</p>
                            {entry.location && <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5"><Icon path={mdiMapMarker} size={0.5} />{entry.location}</span>}
                          </div>
                          <button onClick={() => handleDelete(entry.id)} className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-400 cursor-pointer shrink-0 mt-0.5">
                            <Icon path={mdiDeleteOutline} size={0.6} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  // ── MAIN RENDER ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-40 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">CUỘC SỐNG</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Nhật Ký Đời Tôi</h1>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-lg flex items-center gap-1.5">
          <Icon path={mdiPlus} size={0.875} /><span>Viết nhật ký</span>
        </button>
      </div>

      {/* Mood stats */}
      {moodStats.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Tổng quan cảm xúc ({entries.length} bài)</span>
          <div className="flex flex-wrap gap-2">
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
      <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm">
        {[
          { key: 'timeline', label: 'Timeline', icon: mdiFormatListBulleted },
          { key: 'tree', label: 'Cây thư mục', icon: mdiChevronRight },
          { key: 'map', label: 'Bản đồ', icon: mdiMap },
        ].map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key as any)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${viewMode === v.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <Icon path={v.icon} size={0.75} />{v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Icon path={mdiLoading} size={1.5} className="text-slate-300 animate-spin" /></div>
      ) : viewMode === 'timeline' ? renderTimeline() : viewMode === 'tree' ? renderTree() : (
        <div className="space-y-3">
          <LeafletMap entries={entries} />
        </div>
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
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 max-h-[90vh] overflow-y-auto shadow-[0_-12px_48px_rgba(0,0,0,0.15)]">

                {/* Handle */}
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5" />

                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-white">{editId ? 'Sửa nhật ký' : 'Viết nhật ký'}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer"><Icon path={mdiClose} size={1.25} /></button>
                </div>

                <div className="space-y-4">
                  {/* Date */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Ngày</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-2.5 text-sm font-semibold outline-none dark:text-white" />
                  </div>

                  {/* Mood picker */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Tâm trạng</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.entries(MOOD_CONFIG) as [DiaryMood, typeof MOOD_CONFIG[DiaryMood]][]).map(([k, v]) => (
                        <button key={k} type="button" onClick={() => setMood(k)}
                          className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all cursor-pointer ${mood === k ? `border-current ${v.bg} ${v.color}` : 'border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200'}`}>
                          <Icon path={v.icon} size={1} />
                          <span className="text-[9px] font-bold">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Nội dung *</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Hôm nay tôi cảm thấy..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-3 text-sm font-medium outline-none resize-none dark:text-white leading-relaxed" />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Địa điểm</label>
                    <div className="relative">
                      <Icon path={mdiMapMarker} size={0.875} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="VD: Hà Nội, Hội An..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white" />
                    </div>
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Vĩ độ (Lat)</label>
                      <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} placeholder="VD: 16.047"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-3 py-2.5 text-sm font-medium outline-none dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Kinh độ (Lng)</label>
                      <input type="number" step="0.0001" value={lng} onChange={e => setLng(e.target.value)} placeholder="VD: 108.206"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-3 py-2.5 text-sm font-medium outline-none dark:text-white" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 -mt-2">Tìm tọa độ tại: <a href="https://www.latlong.net" target="_blank" rel="noreferrer" className="text-indigo-500 underline">latlong.net</a></p>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Tags (phân cách bằng dấu phẩy)</label>
                    <div className="relative">
                      <Icon path={mdiTag} size={0.875} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="VD: du lịch, gia đình, công việc"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] text-sm font-medium outline-none dark:text-white" />
                    </div>
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={isSaving}
                  className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm py-4 rounded-[20px] hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2">
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


