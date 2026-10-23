import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiCrosshairsGps,
  mdiCheck,
  mdiMapMarker,
  mdiMap,
  mdiMagnify,
  mdiLoading,
  mdiLayersOutline,
  mdiSatelliteVariant,
} from "@mdi/js";

interface LocationPickerModalProps {
  isOpen: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  initialLocationName?: string;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}

interface SearchResultItem {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const MAPTILER_KEY = "odL8F5mMYH7APbT24t4Q";

export default function LocationPickerModal({
  isOpen,
  initialLat,
  initialLng,
  initialLocationName,
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const [lat, setLat] = useState<number>(initialLat || 10.762622);
  const [lng, setLng] = useState<number>(initialLng || 106.660172);
  const [selectedAddress, setSelectedAddress] = useState<string>(
    initialLocationName || "",
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Search OSM Nominatim
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

  // Map layer type: maptiler streets, maptiler sat hybrid, standard osm
  const [mapType, setMapType] = useState<"streets" | "satellite" | "osm">(
    "streets",
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const layersRef = useRef<{
    streetsLayer?: any;
    satLayer?: any;
    osmLayer?: any;
  }>({});

  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
    }
    if (initialLocationName) {
      setSelectedAddress(initialLocationName);
    }
  }, [initialLat, initialLng, initialLocationName, isOpen]);

  // Reverse geocoding via OSM Nominatim
  const reverseGeocode = useCallback(async (latVal: number, lngVal: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`,
        {
          headers: { "Accept-Language": "vi,en" },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setSelectedAddress(data.display_name);
        }
      }
    } catch (e) {
      // quiet fallback
    }
  }, []);

  // Search OSM Nominatim
  const handleSearchOSM = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim(),
        )}&limit=6&addressdetails=1`,
        {
          headers: { "Accept-Language": "vi,en" },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        setShowResults(true);
      }
    } catch (err) {
      console.warn("OSM Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchOSM(val);
      }, 400);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResultItem) => {
    const targetLat = Number(parseFloat(result.lat).toFixed(6));
    const targetLng = Number(parseFloat(result.lon).toFixed(6));
    setLat(targetLat);
    setLng(targetLng);
    const placeName = result.display_name || result.name;
    setSelectedAddress(placeName);
    setShowResults(false);
    setSearchQuery(result.name || placeName);

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([targetLat, targetLng]);
      mapInstanceRef.current.flyTo([targetLat, targetLng], 16, {
        duration: 1.2,
      });
      markerRef.current
        .bindPopup(
          `<div style="font-size:12px;font-weight:700;color:#1e293b;padding:2px;">📍 ${placeName}</div>`,
        )
        .openPopup();
    }
  };

  // Switch Layer
  const handleSwitchLayer = (type: "streets" | "satellite" | "osm") => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current.streetsLayer) return;

    const { streetsLayer, satLayer, osmLayer } = layersRef.current;
    if (map.hasLayer(streetsLayer)) map.removeLayer(streetsLayer);
    if (map.hasLayer(satLayer)) map.removeLayer(satLayer);
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);

    if (type === "streets") {
      map.addLayer(streetsLayer);
    } else if (type === "satellite") {
      map.addLayer(satLayer);
    } else {
      map.addLayer(osmLayer);
    }
    setMapType(type);
  };

  // Initialize Map
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

      // 1. MapTiler Streets v2 (Lớp nền chính đẹp, sắc nét, tiếng Việt)
      const streetsLayer = L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
        {
          maxZoom: 19,
          attribution: "&copy; MapTiler &copy; OpenStreetMap",
        },
      ).addTo(map);

      // 2. MapTiler Hybrid Satellite
      const satLayer = L.tileLayer(
        `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
        {
          maxZoom: 19,
          attribution: "&copy; MapTiler &copy; OpenStreetMap",
        },
      );

      // 3. OpenStreetMap Chuẩn
      const osmLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        },
      );

      layersRef.current = { streetsLayer, satLayer, osmLayer };

      // Custom Pin Marker
      const customIcon = L.divIcon({
        className: "custom-map-picker-pin",
        html: `
          <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;background:#ef4444;opacity:0.35;border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="width:26px;height:26px;background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);border-radius:50%;border:3px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1;">
              <div style="width:7px;height:7px;background:#ffffff;border-radius:50%;"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([curLat, curLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // Handle marker drag
      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        reverseGeocode(newLat, newLng);
      });

      // Handle map click
      map.on("click", (e: any) => {
        const clickLat = Number(e.latlng.lat.toFixed(6));
        const clickLng = Number(e.latlng.lng.toFixed(6));
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
        reverseGeocode(clickLat, clickLng);
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
  }, [isOpen, reverseGeocode]);

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
        reverseGeocode(curLat, curLng);

        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([curLat, curLng]);
          mapInstanceRef.current.flyTo([curLat, curLng], 16, { duration: 1.2 });
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
    <div className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      {/* Expanded Dialog: larger width & height for superior visibility and ergonomics */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl lg:max-w-5xl h-[90vh] max-h-[94vh] overflow-hidden flex flex-col shadow-2xl border border-white/20 dark:border-slate-700/60 transition-all">
        {/* Header with Title and Close */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-white dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-xs">
              <Icon path={mdiMapMarker} size={0.9} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                Chọn vị trí bài viết & tọa độ bản đồ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Tìm kiếm địa điểm (OSM) hoặc click trực tiếp trên bản đồ MapTiler
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            <Icon path={mdiClose} size={0.8} />
          </button>
        </div>

        {/* Search & Top Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50/90 dark:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-700/70 space-y-3 shrink-0">
          {/* OSM Search Box */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
              <Icon
                path={isSearching ? mdiLoading : mdiMagnify}
                size={0.85}
                className={`text-slate-400 shrink-0 ${
                  isSearching ? "animate-spin text-blue-500" : ""
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchOSM(searchQuery);
                  }
                }}
                placeholder="Tìm kiếm địa điểm OSM (Ví dụ: Chợ Bến Thành, Hồ Hoàn Kiếm, Đà Lạt...)"
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                >
                  <Icon path={mdiClose} size={0.65} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSearchOSM(searchQuery)}
                disabled={!searchQuery.trim() || isSearching}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Tìm
              </button>
            </div>

            {/* Search Suggestions Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[1000] max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Kết quả tìm kiếm OpenStreetMap ({searchResults.length})
                </div>
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-slate-100 dark:border-slate-700/50 last:border-none flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <Icon
                      path={mdiMapMarker}
                      size={0.75}
                      className="text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name || item.display_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {item.display_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coordinates & GPS Helper Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Latitude input */}
            <div className="sm:col-span-4 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                Lat:
              </span>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) =>
                  handleLatChange(parseFloat(e.target.value) || 0)
                }
                placeholder="Vĩ độ (Lat)"
                className="w-full bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            {/* Longitude input */}
            <div className="sm:col-span-4 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                Lng:
              </span>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) =>
                  handleLngChange(parseFloat(e.target.value) || 0)
                }
                placeholder="Kinh độ (Lng)"
                className="w-full bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>

            {/* GPS Locate Button */}
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={handleGetCurrentGPS}
                disabled={isLocating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-blue-200/50 dark:border-blue-800/40"
              >
                <Icon
                  path={mdiCrosshairsGps}
                  size={0.7}
                  className={isLocating ? "animate-spin text-blue-600" : ""}
                />
                <span>
                  {isLocating ? "Đang dò GPS..." : "Định vị vị trí của tôi"}
                </span>
              </button>
            </div>
          </div>

          {/* Active Address Ribbon */}
          {selectedAddress && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
              <Icon path={mdiMapMarker} size={0.65} className="text-rose-500 shrink-0" />
              <span className="font-bold shrink-0">Địa điểm:</span>
              <span className="truncate font-medium">{selectedAddress}</span>
            </div>
          )}
        </div>

        {/* Map Viewport (Flexible Height, Large Canvas) */}
        <div className="relative w-full flex-1 min-h-[360px] md:min-h-[480px] bg-slate-200 dark:bg-slate-900 overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full absolute inset-0 z-0"
          />

          {/* Floating Base Map Layer Switcher (Top Right) */}
          <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 p-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSwitchLayer("streets")}
              title="Lớp nền đường phố MapTiler streets-v2"
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                mapType === "streets"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Icon path={mdiMap} size={0.6} />
              <span>Đường phố</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchLayer("satellite")}
              title="Lớp nền vệ tinh MapTiler Hybrid"
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                mapType === "satellite"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Icon path={mdiSatelliteVariant} size={0.6} />
              <span>Vệ tinh</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchLayer("osm")}
              title="Lớp nền OpenStreetMap chuẩn"
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                mapType === "osm"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Icon path={mdiLayersOutline} size={0.6} />
              <span>OSM</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <span className="hidden sm:inline font-bold">Tọa độ đã chọn:</span>
            <span className="bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 font-bold">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectLocation(lat, lng, selectedAddress);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
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
