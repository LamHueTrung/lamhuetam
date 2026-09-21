import toast from "react-hot-toast";

/**
 * Sinh URL ảnh thumbnail thu nhỏ từ Supabase Storage hoặc URL thông thường
 */
export function getThumbnailUrl(url: string, width = 600, quality = 80): string {
  if (!url) return "";

  // Supabase Storage Image Transformation (nếu dùng endpoint render)
  if (url.includes("/storage/v1/object/public/")) {
    return url.replace("/storage/v1/object/public/", `/storage/v1/render/image/public/`) + `?width=${width}&quality=${quality}`;
  }

  return url;
}

/**
 * Tải ảnh về thiết bị
 */
export async function downloadImage(url: string, customFilename?: string): Promise<void> {
  const toastId = toast.loading("Đang tải ảnh xuống...");
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    
    // Tạo tên file tải xuống
    const ext = blob.type.split("/")[1] || "jpg";
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    a.download = customFilename || `lamhuetam_photo_${timestamp}.${ext}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    toast.success("Đã tải ảnh xuống thành công!", { id: toastId });
  } catch (error) {
    console.error("Lỗi khi tải ảnh:", error);
    // Fallback nếu bị CORS chặn fetch blob
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = customFilename || "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Đang mở ảnh để tải xuống...", { id: toastId });
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng mở ảnh trong tab mới.", { id: toastId });
    }
  }
}
