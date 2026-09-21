import React, { useState } from "react";
import { Icon } from "@mdi/react";
import {
  mdiPencil,
  mdiDeleteOutline,
  mdiPin,
  mdiPinOff,
  mdiCommentOutline,
  mdiMapMarker,
  mdiThumbUp,
  mdiThumbUpOutline,
  mdiShareOutline,
  mdiDotsHorizontal,
  mdiContentCopy,
  mdiEarth,
  mdiSend,
  mdiLoading,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import type { DiaryEntry } from "../types";
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import { getThumbnailUrl } from "../utils/imageUtils";
import PhotoLightboxModal from "./PhotoLightboxModal";

interface Props {
  entry: DiaryEntry;
  index: number;
  authorAvatar?: string;
  authorName?: string;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onViewDetail: (entry: DiaryEntry) => void;
  onAddReply?: (entryId: string, content: string) => Promise<void>;
  onDeleteReply?: (entryId: string, replyId: string) => Promise<void>;
}

function FeedImageItem({
  src,
  alt,
  className = "",
  imgClassName = "w-full h-full object-cover",
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => getThumbnailUrl(src, 80));

  // Cập nhật URL khi src prop thay đổi
  React.useEffect(() => {
    setCurrentSrc(getThumbnailUrl(src, 80));
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    // Nếu URL transform lỗi, quay về link gốc
    if (currentSrc !== src) {
      setCurrentSrc(src);
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="absolute inset-0 shimmer-slide" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`${imgClassName} transition-opacity duration-300 hover:opacity-95 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function EntryCard({
  entry,
  index,
  authorAvatar = "/avatar.jpg",
  authorName = "Lâm Huệ Trung",
  onEdit,
  onDelete,
  onPin,
  onViewDetail,
  onAddReply,
  onDeleteReply,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const m = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.positive;

  const formatDate = (d: string) => {
    try {
      const dateObj = new Date(d + "T00:00:00");
      return dateObj.toLocaleDateString("vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.content);
    setShowMenu(false);
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || isSubmittingComment || !onAddReply) return;
    setIsSubmittingComment(true);
    try {
      const targetId = entry.id || (entry as any)._id;
      await onAddReply(targetId, commentText.trim());
      setCommentText("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const images = Array.isArray(entry.images)
    ? entry.images.filter(
        (img) => typeof img === "string" && img.trim().length > 0,
      )
    : typeof entry.images === "string" &&
        (entry.images as string).trim().length > 0
      ? [entry.images]
      : [];
  const replyCount = (entry.replies || []).length;

  const handleOpenPhoto = (e: React.MouseEvent, imgIndex: number) => {
    e.stopPropagation();
    setLightboxIndex(imgIndex);
  };

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.25) }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden"
      >
        {/* 1. Facebook Post Header */}
        <div className="p-3 sm:p-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={authorAvatar || "/avatar.jpg"}
              onError={(e) => {
                e.currentTarget.src = "/avatar.jpg";
              }}
              alt={authorName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
            />

            <div className="min-w-0 flex-1">
              {/* Top row: Name + Feeling */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">
                  {authorName}
                </span>

                {entry.mood && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    đang cảm thấy{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {m.emoji} {m.label}
                    </span>
                  </span>
                )}
              </div>

              {/* Sub row: Date + Privacy icon + Pinned badge + Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal mt-0.5 flex-wrap">
                <span>{formatDate(entry.date)}</span>
                <span>·</span>
                <span title="Công khai">
                  <Icon path={mdiEarth} size={0.55} className="inline" />
                </span>

                {entry.location && (
                  <>
                    <span>·</span>
                    {entry.lat && entry.lng ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${entry.lat},${entry.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Mở Google Maps chỉ đường"
                        className="flex items-center gap-0.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:underline font-medium truncate max-w-[140px] cursor-pointer"
                      >
                        <Icon
                          path={mdiMapMarker}
                          size={0.5}
                          className="text-rose-500 shrink-0"
                        />
                        <span className="truncate">{entry.location}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                        <Icon
                          path={mdiMapMarker}
                          size={0.5}
                          className="text-rose-500 shrink-0"
                        />
                        <span className="truncate">{entry.location}</span>
                      </span>
                    )}
                  </>
                )}

                {entry.pinned && (
                  <span className="inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    <Icon path={mdiPin} size={0.45} />
                    Đã ghim
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Three Dots Menu Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              title="Tùy chọn bài viết"
            >
              <Icon path={mdiDotsHorizontal} size={0.85} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-9 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-1.5 z-50 space-y-0.5 select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onPin(entry.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Icon
                        path={entry.pinned ? mdiPinOff : mdiPin}
                        size={0.7}
                        className="text-amber-500"
                      />
                      <span>
                        {entry.pinned ? "Bỏ ghim bài viết" : "Ghim bài viết"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Icon
                        path={mdiContentCopy}
                        size={0.7}
                        className="text-indigo-500"
                      />
                      <span>Sao chép nội dung</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onEdit(entry);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Icon
                        path={mdiPencil}
                        size={0.7}
                        className="text-blue-500"
                      />
                      <span>Chỉnh sửa bài viết</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                    <button
                      type="button"
                      onClick={() => {
                        onDelete(entry.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Icon path={mdiDeleteOutline} size={0.7} />
                      <span>Xóa bài viết</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. Text Content */}
        <div
          className="px-3 sm:px-4 pb-3 cursor-pointer"
          onClick={() => onViewDetail(entry)}
        >
          <p className="text-[15px] text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
            {entry.content}
          </p>
        </div>

        {/* 3. Photo Grid Gallery with Thumbnail + Lightbox Trigger */}
        {images.length > 0 && (
          <div className="mb-2 select-none">
            {images.length === 1 && (
              <div
                className="w-full bg-slate-50 dark:bg-slate-900/40 overflow-hidden cursor-pointer flex items-center justify-center"
                onClick={(e) => handleOpenPhoto(e, 0)}
              >
                <FeedImageItem
                  src={images[0]}
                  alt="Ảnh bài viết"
                  className="w-full flex items-center justify-center"
                  imgClassName="w-full h-auto max-h-[600px] object-contain"
                />
              </div>
            )}

            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900">
                {images.map((imgUrl, i) => (
                  <FeedImageItem
                    key={i}
                    src={imgUrl}
                    alt={`Ảnh ${i + 1}`}
                    className="aspect-square"
                    imgClassName="w-full h-full object-cover"
                    onClick={(e) => handleOpenPhoto(e, i)}
                  />
                ))}
              </div>
            )}

            {images.length === 3 && (
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 aspect-[4/3] sm:aspect-[16/10]">
                <FeedImageItem
                  src={images[0]}
                  alt="Ảnh 1"
                  className="col-span-2 h-full"
                  imgClassName="w-full h-full object-cover"
                  onClick={(e) => handleOpenPhoto(e, 0)}
                />
                <div className="flex flex-col gap-1 h-full">
                  <FeedImageItem
                    src={images[1]}
                    alt="Ảnh 2"
                    className="flex-1 h-full"
                    imgClassName="w-full h-full object-cover"
                    onClick={(e) => handleOpenPhoto(e, 1)}
                  />
                  <FeedImageItem
                    src={images[2]}
                    alt="Ảnh 3"
                    className="flex-1 h-full"
                    imgClassName="w-full h-full object-cover"
                    onClick={(e) => handleOpenPhoto(e, 2)}
                  />
                </div>
              </div>
            )}

            {images.length >= 4 && (
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900">
                {images.slice(0, 4).map((imgUrl, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden cursor-pointer"
                    onClick={(e) => handleOpenPhoto(e, i)}
                  >
                    <FeedImageItem
                      src={imgUrl}
                      alt={`Ảnh ${i + 1}`}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                    />
                    {i === 3 && images.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-2xl hover:bg-black/50 transition-colors">
                        +{images.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Tags List */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="px-3 sm:px-4 pb-2 flex items-center gap-1.5 flex-wrap">
            {entry.tags.map((t, idx) => (
              <span
                key={idx}
                className="text-xs font-semibold text-[#1877F2] hover:underline cursor-pointer"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* 5. Metrics row */}
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[9px]">
              <Icon path={mdiThumbUp} size={0.5} />
            </span>
            <span>{liked ? 1 : 0}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className="hover:underline cursor-pointer"
            >
              {replyCount > 0 ? `${replyCount} bình luận` : "Chưa có bình luận"}
            </button>
          </div>
        </div>

        {/* 6. Action Buttons Bar (Like / Comment / Share) */}
        <div className="px-2 py-1 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setLiked(!liked)}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 ${
              liked ? "text-[#1877F2]" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <Icon
              path={liked ? mdiThumbUp : mdiThumbUpOutline}
              size={0.75}
              className={liked ? "scale-110" : ""}
            />
            <span>Thích</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 ${
              showComments
                ? "text-[#1877F2] bg-blue-50/50 dark:bg-blue-950/30"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <Icon path={mdiCommentOutline} size={0.75} />
            <span>Bình luận</span>
          </button>
        </div>

        {/* 7. Inline Comments Section (Facebook style) */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40 p-3 sm:p-4 space-y-3 overflow-hidden"
            >
              {/* Existing comments list */}
              {entry.replies && entry.replies.length > 0 ? (
                <div className="space-y-2.5">
                  {entry.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start gap-2.5 group"
                    >
                      <img
                        src={
                          reply.authorAvatar || authorAvatar || "/avatar.jpg"
                        }
                        onError={(e) => {
                          e.currentTarget.src = "/avatar.jpg";
                        }}
                        alt={reply.authorName || authorName}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs inline-block max-w-full">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {reply.authorName || authorName}
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words mt-0.5 leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium pl-2 mt-0.5">
                          <span>{reply.time}</span>
                          {onDeleteReply && (
                            <>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const targetId =
                                    entry.id || (entry as any)._id;
                                  onDeleteReply(targetId, reply.id);
                                }}
                                className="hover:text-rose-500 cursor-pointer font-semibold"
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-1">
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                </p>
              )}

              {/* Comment Input Box */}
              <form
                onSubmit={handleSendComment}
                className="flex items-center gap-2 pt-1"
              >
                <img
                  src={authorAvatar || "/avatar.jpg"}
                  onError={(e) => {
                    e.currentTarget.src = "/avatar.jpg";
                  }}
                  alt={authorName}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Viết bình luận công khai..."
                    className="w-full pl-3.5 pr-10 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="absolute right-1.5 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer shadow-xs"
                    title="Gửi bình luận"
                  >
                    <Icon
                      path={isSubmittingComment ? mdiLoading : mdiSend}
                      size={0.5}
                      className={isSubmittingComment ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <PhotoLightboxModal
          isOpen={lightboxIndex !== null}
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          title={`Bài viết ngày ${formatDate(entry.date)}`}
        />
      )}
    </>
  );
}
