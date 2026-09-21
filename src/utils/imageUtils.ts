import toast from "react-hot-toast";

/**
 * Sinh URL ảnh thumbnail từ Supabase Storage hoặc URL thông thường
 * Giữ nguyên width và height gốc của ảnh, chỉ nén giảm chất lượng để tải nhanh, không xén bớt ảnh
 */
export function getThumbnailUrl(
  url: string,
  quality = 80
): string {
  if (!url) return "";

  // Supabase Storage Image Transformation (chỉ chỉnh quality, giữ nguyên kích thước gốc)
  if (url.includes("/storage/v1/object/public/")) {
    return url.replace("/storage/v1/object/public/", `/storage/v1/render/image/public/`) + `?quality=${quality}`;
  }

  return url;
}

/**
 * Nén và giảm kích thước ảnh trước khi upload (giữ tỉ lệ ảnh, giới hạn max dimension 1920px)
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // Bỏ qua nếu không phải ảnh hoặc là ảnh gif/svg
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        // Nếu kích thước nhỏ hơn maxDimension và dung lượng < 1.5MB thì giữ nguyên
        if (width <= maxDimension && height <= maxDimension && file.size < 1.5 * 1024 * 1024) {
          return resolve(file);
        }

        // Tính toán lại kích thước tỉ lệ
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const optimizedFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
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
