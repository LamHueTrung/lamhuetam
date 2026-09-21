import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiCrosshairsGps,
  mdiCheck,
  mdiMapMarker,
  mdiMap,
} from "@mdi/js";

interface LocationPickerModalProps {
  isOpen: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
}

export default function LocationPickerModal({
  isOpen,
  initialLat,
  initialLng,
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const [lat, setLat] = useState<number>(initialLat || 10.762622);
  const [lng, setLng] = useState<number>(initialLng || 106.660172);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    // Load Leaflet CSS if not already present
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) {
        // Dynamically load leaflet script if needed
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap();
        document.body.appendChild(script);
      } else {
        initMap();
      }
    }, 150);

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const curLat = lat || 10.762622;
      const curLng = lng || 106.660172;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([curLat, curLng], 14);

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom pulse marker icon
      const customIcon = L.divIcon({
        className: "custom-map-picker-pin",
        html: `<div style="background-color:#EF4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                <div style="width:6px;height:6px;background:white;border-radius:50%;"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([curLat, curLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // Handle marker drag
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setLat(Number(pos.lat.toFixed(6)));
        setLng(Number(pos.lng.toFixed(6)));
      });

      // Handle map click
      map.on("click", (e: any) => {
        const clickLat = Number(e.latlng.lat.toFixed(6));
        const clickLng = Number(e.latlng.lng.toFixed(6));
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
      });

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    };

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleLatChange = (val: number) => {
    setLat(val);
    if (markerRef.current && mapInstanceRef.current && !isNaN(val)) {
      markerRef.current.setLatLng([val, lng]);
      mapInstanceRef.current.panTo([val, lng]);
    }
  };

  const handleLngChange = (val: number) => {
    setLng(val);
    if (markerRef.current && mapInstanceRef.current && !isNaN(val)) {
      markerRef.current.setLatLng([lat, val]);
      mapInstanceRef.current.panTo([lat, val]);
    }
  };

  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert("Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const curLat = Number(pos.coords.latitude.toFixed(6));
        const curLng = Number(pos.coords.longitude.toFixed(6));
        setLat(curLat);
        setLng(curLng);
        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([curLat, curLng]);
          mapInstanceRef.current.setView([curLat, curLng], 15);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("Lỗi lấy vị trí GPS:", err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl border border-white/20 dark:border-slate-700/50">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Icon path={mdiMapMarker} size={0.9} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Chọn tọa độ vị trí
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">
                Chạm trên bản đồ hoặc nhập tọa độ Long/Lat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Icon path={mdiClose} size={0.8} />
          </button>
        </div>

        {/* Coords inputs & GPS helper */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Vĩ độ (Latitude / Lat)
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) =>
                  handleLatChange(parseFloat(e.target.value) || 0)
                }
                placeholder="Ví dụ: 10.762622"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Kinh độ (Longitude / Lng)
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) =>
                  handleLngChange(parseFloat(e.target.value) || 0)
                }
                placeholder="Ví dụ: 106.660172"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleGetCurrentGPS}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Icon
                path={mdiCrosshairsGps}
                size={0.75}
                className={isLocating ? "animate-spin" : ""}
              />
              <span>
                {isLocating
                  ? "Đang định vị GPS..."
                  : "Lấy vị trí GPS hiện tại của tôi"}
              </span>
            </button>
          </div>
        </div>

        {/* Map Viewport */}
        <div className="relative w-full flex-1 min-h-[280px] md:min-h-[340px] bg-slate-200 dark:bg-slate-900">
          <div
            ref={mapContainerRef}
            className="w-full h-full absolute inset-0 z-0"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectLocation(lat, lng);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Icon path={mdiCheck} size={0.8} />
              <span>Xác nhận vị trí</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
