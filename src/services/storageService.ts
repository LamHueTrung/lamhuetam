import { supabase } from "../lib/supabase";

/**
 * Upload ảnh đại diện người dùng lên Supabase Storage bucket 'avatars'
 * Fallback tạo bucket hoặc thư mục nếu cần.
 */
export async function uploadAvatar(file: File, userId: string = "profile"): Promise<string> {
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Lỗi khi tải ảnh đại diện lên Supabase Storage:", uploadError);
    throw new Error(`Upload ảnh avatar thất bại: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload hình ảnh bài viết nhật ký lên Supabase Storage bucket 'diary-images'
 */
export async function uploadDiaryImage(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop() || "jpg";
  const cleanFileName = `diary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `photos/${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("diary-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Lỗi khi tải ảnh nhật ký lên Supabase Storage:", uploadError);
    throw new Error(`Upload ảnh nhật ký thất bại: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("diary-images").getPublicUrl(filePath);
  return data.publicUrl;
}
