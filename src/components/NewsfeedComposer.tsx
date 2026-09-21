import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiImageMultiple,
  mdiMapMarker,
  mdiTagOutline,
  mdiPin,
  mdiLoading,
  mdiCalendar,
  mdiEmoticonHappy,
  mdiEarth,
  mdiPlus,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { DiaryEntry, DiaryMood } from "../types";
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import { getLocalDateString } from "../utils/date";
import { uploadDiaryImage } from "../services/storageService";
import { compressAndResizeImage } from "../utils/imageUtils";
import LocationPickerModal from "./LocationPickerModal";

interface NewsfeedComposerProps {
  initialEntry?: DiaryEntry | null;
  authorAvatar?: string;
  authorName?: string;
  onSave: (entryData: Omit<DiaryEntry, "id" | "_id" | "createdAt">) => Promise<void>;
  onClose?: () => void;
  isModal?: boolean;
}

export default function NewsfeedComposer({
  initialEntry,
  authorAvatar,
  authorName = "Lâm Huệ Trung",
  onSave,
  onClose,
  isModal = false,
}: NewsfeedComposerProps) {
  // Modal state for creating post
  const [isOpenModal, setIsOpenModal] = useState(isModal || false);

  const [content, setContent] = useState(initialEntry?.content || "");
  const [date, setDate] = useState(initialEntry?.date || getLocalDateString());
  const [mood, setMood] = useState<DiaryMood>(initialEntry?.mood || "positive");
  const [location, setLocation] = useState(initialEntry?.location || "");
  const [lat, setLat] = useState<number | null>(initialEntry?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialEntry?.lng ?? null);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [pinned, setPinned] = useState<boolean>(initialEntry?.pinned || false);

  // Images state
  const [images, setImages] = useState<string[]>(initialEntry?.images || []);
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);

  // UI pickers
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto detect GPS location on new post creation
  useEffect(() => {
    if (!initialEntry && lat === null && lng === null) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const curLat = Number(pos.coords.latitude.toFixed(5));
            const curLng = Number(pos.coords.longitude.toFixed(5));
            setLat(curLat);
            setLng(curLng);
            if (!location) {
              setLocation("Vị trí hiện tại");
            }
          },
          (err) => {
            console.log("GPS auto-detect skipped:", err.message);
          },
          { timeout: 6000, enableHighAccuracy: false }
        );
      }
    }
  }, [initialEntry]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpenModal) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpenModal]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const toastId = toast.loading("Đang tải ảnh lên...");

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`Ảnh ${file.name} quá 20MB!`);
          continue;
        }
        // Tối ưu và nén ảnh (giữ tỉ lệ chuẩn, max 1920px, loại bỏ dung lượng thừa)
        const optimizedFile = await compressAndResizeImage(file, 1920, 0.85);
        const url = await uploadDiaryImage(optimizedFile);
        uploadedUrls.push(url);
      }

      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`Đã tải lên ${uploadedUrls.length} ảnh!`, { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi upload ảnh", { id: toastId });
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung bài viết!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        date,
        content: content.trim(),
        mood,
        location: location.trim(),
        lat,
        lng,
        tags,
        images,
        pinned,
        replies: initialEntry?.replies || [],
      });

      toast.success(initialEntry ? "Cập nhật bài viết thành công!" : "Đã đăng bài viết mới!");
      if (onClose) onClose();
      if (!isModal) {
        setIsOpenModal(false);
        setContent("");
        setImages([]);
        setTags([]);
        setShowMoodPicker(false);
        setShowTagInput(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Không thể lưu bài viết");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMoodConfig = MOOD_CONFIG[mood] || MOOD_CONFIG.positive;

  // ─────────────────────────────────────────────────────────────
  // 1. COLLAPSED FACEBOOK COMPOSER (In Feed View)
  // ─────────────────────────────────────────────────────────────
  const collapsedComposer = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 dark:border-slate-700/80 space-y-3">
      {/* Top row: Avatar + Pill Input */}
      <div className="flex items-center gap-3">
        <img
          src={authorAvatar || "/avatar.jpg"}
          onError={(e) => {
            e.currentTarget.src = "/avatar.jpg";
          }}
          alt={authorName}
          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
        />

        <button
          type="button"
          onClick={() => setIsOpenModal(true)}
          className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full text-sm font-medium transition-colors cursor-pointer truncate"
        >
          {authorName} ơi, bạn đang nghĩ gì thế?
        </button>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700/70" />

      {/* Bottom row: 3 Iconic Facebook Action Buttons */}
      <div className="grid grid-cols-3 gap-1">
        {/* Photo Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpenModal(true);
            setTimeout(() => fileInputRef.current?.click(), 250);
          }}
          className="py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <Icon path={mdiImageMultiple} size={0.85} className="text-emerald-500" />
          <span>Ảnh/video</span>
        </button>

        {/* Emotion Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpenModal(true);
            setShowMoodPicker(true);
          }}
          className="py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <Icon path={mdiEmoticonHappy} size={0.85} className="text-amber-500" />
          <span>Cảm xúc</span>
        </button>

        {/* Location Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpenModal(true);
            setIsLocationModalOpen(true);
          }}
          className="py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <Icon path={mdiMapMarker} size={0.85} className="text-rose-500" />
          <span>Check in</span>
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // 2. FACEBOOK CREATE POST MODAL
  // ─────────────────────────────────────────────────────────────
  const modalComposer = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh] my-auto"
      >
        {/* Modal Header */}
        <div className="relative px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {initialEntry ? "Chỉnh sửa bài viết" : "Tạo bài viết"}
          </h3>
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              setIsOpenModal(false);
            }}
            className="absolute right-3 top-2.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Icon path={mdiClose} size={0.8} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* User Info & Meta Badges */}
          <div className="flex items-center gap-3">
            <img
              src={authorAvatar || "/avatar.jpg"}
              onError={(e) => {
                e.currentTarget.src = "/avatar.jpg";
              }}
              alt={authorName}
              className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {authorName}
                </span>
                {mood && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    đang cảm thấy <span className="font-semibold">{currentMoodConfig.emoji} {currentMoodConfig.label}</span>
                  </span>
                )}
              </div>

              {/* Privacy Pill & Date */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  <Icon path={mdiEarth} size={0.45} />
                  <span>Công khai</span>
                </span>

                <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer hover:bg-slate-200">
                  <Icon path={mdiCalendar} size={0.45} />
                  <span>{date}</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="sr-only"
                  />
                </label>

                {pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[11px] font-bold">
                    <Icon path={mdiPin} size={0.4} />
                    <span>Đã ghim</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Text Area */}
          <div className="py-2">
            <textarea
              ref={textareaRef}
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`${authorName} ơi, bạn đang nghĩ gì thế?`}
              className="w-full bg-transparent text-base text-slate-900 dark:text-white placeholder-slate-400 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Location Chip */}
          {location && (
            <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 min-w-0">
                <Icon path={mdiMapMarker} size={0.7} className="shrink-0 text-rose-500" />
                <span className="truncate">tại {location}</span>
                {lat && lng && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({lat.toFixed(2)}, {lng.toFixed(2)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Đổi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocation("");
                    setLat(null);
                    setLng(null);
                  }}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Icon path={mdiClose} size={0.6} />
                </button>
              </div>
            </div>
          )}

          {/* Tags List */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-blue-800 cursor-pointer"
                  >
                    <Icon path={mdiClose} size={0.45} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Inline Tag Input */}
          <AnimatePresence>
            {showTagInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                  <Icon path={mdiTagOutline} size={0.7} className="text-slate-400 ml-2" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Nhập thẻ chủ đề..."
                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mood Picker Selector */}
          <AnimatePresence>
            {showMoodPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">
                    Bạn đang cảm thấy thế nào?
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {(Object.keys(MOOD_CONFIG) as DiaryMood[]).map((mKey) => {
                      const cfg = MOOD_CONFIG[mKey];
                      const isSelected = mood === mKey;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => {
                            setMood(mKey);
                            setShowMoodPicker(false);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white font-bold shadow-sm"
                              : "bg-white/90 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <span className="text-base leading-none">{cfg.emoji}</span>
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attached Images Grid */}
          {images.length > 0 && (
            <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/40">
              <div className="grid grid-cols-3 gap-2">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <img
                      src={imgUrl}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <Icon path={mdiClose} size={0.55} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* "Thêm vào bài viết của bạn" (Facebook Toolbar Box) */}
          <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Thêm vào bài viết của bạn
            </span>

            <div className="flex items-center gap-1">
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handleSelectFiles}
                className="hidden"
              />

              {/* Photo */}
              <button
                type="button"
                disabled={uploadingImages}
                onClick={() => fileInputRef.current?.click()}
                title="Ảnh/video"
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon
                  path={uploadingImages ? mdiLoading : mdiImageMultiple}
                  size={0.85}
                  className={uploadingImages ? "animate-spin text-emerald-500" : "text-emerald-500"}
                />
              </button>

              {/* Emotion */}
              <button
                type="button"
                onClick={() => setShowMoodPicker(!showMoodPicker)}
                title="Cảm xúc/hoạt động"
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon path={mdiEmoticonHappy} size={0.85} className="text-amber-500" />
              </button>

              {/* Location */}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                title="Check in / Vị trí"
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon path={mdiMapMarker} size={0.85} className="text-rose-500" />
              </button>

              {/* Tag */}
              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                title="Gắn thẻ chủ đề"
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icon path={mdiTagOutline} size={0.85} className="text-blue-500" />
              </button>

              {/* Pin */}
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                title={pinned ? "Bỏ ghim" : "Ghim bài viết"}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  pinned
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/60"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                }`}
              >
                <Icon path={mdiPin} size={0.8} className={pinned ? "rotate-45" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Full Width Facebook Blue Post Button */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || uploadingImages || !content.trim()}
            className="w-full py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-sm font-bold shadow-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Icon path={mdiLoading} size={0.8} className="animate-spin" />}
            <span>{initialEntry ? "Lưu" : "Đăng"}</span>
          </button>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        initialLat={lat}
        initialLng={lng}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={(selectedLat, selectedLng) => {
          setLat(selectedLat);
          setLng(selectedLng);
          if (!location) setLocation(`Tọa độ [${selectedLat}, ${selectedLng}]`);
        }}
      />
    </div>
  );

  // If used as an embedded modal or opened modal
  if (isModal) {
    return modalComposer;
  }

  return (
    <>
      {collapsedComposer}
      {isOpenModal && modalComposer}
    </>
  );
}
