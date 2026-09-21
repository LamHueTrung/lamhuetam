import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiDownload,
  mdiChevronLeft,
  mdiChevronRight,
  mdiOpenInNew,
  mdiLoading,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { downloadImage } from "../utils/imageUtils";

interface PhotoLightboxModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export default function PhotoLightboxModal({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  title,
}: PhotoLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsLoading(true);
    }
  }, [isOpen, initialIndex]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setIsLoading(true);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setIsLoading(true);
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex flex-col justify-between bg-black/95 backdrop-blur-xl select-none">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent text-white z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
              {currentIndex + 1} / {images.length}
            </span>
            {title && (
              <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download button */}
            <button
              type="button"
              onClick={() => downloadImage(currentImage, `lamhuetam_photo_${currentIndex + 1}.jpg`)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title="Tải ảnh này về máy"
            >
              <Icon path={mdiDownload} size={0.9} />
            </button>

            {/* Open in new tab */}
            <a
              href={currentImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all inline-flex items-center justify-center cursor-pointer"
              title="Mở ảnh gốc trong tab mới"
            >
              <Icon path={mdiOpenInNew} size={0.9} />
            </a>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white transition-all cursor-pointer ml-1"
              title="Đóng (Esc)"
            >
              <Icon path={mdiClose} size={1} />
            </button>
          </div>
        </div>

        {/* Center Main Image Container */}
        <div
          className="flex-1 flex items-center justify-center p-2 sm:p-6 relative overflow-hidden cursor-default"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <Icon path={mdiLoading} size={2} className="text-white/60 animate-spin" />
            </div>
          )}

          <motion.img
            key={currentImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            src={currentImage}
            alt={`Ảnh ${currentIndex + 1}`}
            onLoad={() => setIsLoading(false)}
            className="max-h-[82vh] max-w-[94vw] sm:max-w-[90vw] object-contain rounded-lg shadow-2xl z-10"
          />

          {/* Navigation Controls (Left / Right) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/50 hover:bg-black/80 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-lg z-20"
                title="Ảnh trước (Mũi tên trái)"
              >
                <Icon path={mdiChevronLeft} size={1.25} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/50 hover:bg-black/80 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-white/20 shadow-lg z-20"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <Icon path={mdiChevronRight} size={1.25} />
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnail Strip (if multiple images) */}
        {images.length > 1 && (
          <div className="p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2 overflow-x-auto z-20">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (currentIndex !== idx) {
                    setIsLoading(true);
                    setCurrentIndex(idx);
                  }
                }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  currentIndex === idx
                    ? "border-white scale-110 shadow-lg"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
