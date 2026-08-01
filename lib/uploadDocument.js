import { supabase } from "@/lib/supabaseClient";

/**
 * Uploads a single document image (CNIC / Licence / Route Permit scan) to
 * the public "driver-documents" Storage bucket and returns its public URL.
 *
 * @param {File} file       the image file picked in <input type="file">
 * @param {string} userId   the uploading driver's auth user id (used as folder)
 * @param {string} label    short label used in the filename, e.g. "cnic"
 * @returns {Promise<string|null>} public URL, or null if no file was given
 */
export async function uploadDriverDocument(file, userId, label) {
  if (!file) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("driver-documents")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("driver-documents").getPublicUrl(path);
  return data.publicUrl;
}
