import { supabase } from "@/lib/supabaseBrowserClient";

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

/**
 * Uploads a shipment-related photo (driver's weighment slip / "kande ki
 * parchi" during Documentation, or the arrival proof photo at Reached
 * Destination) to the public "shipment-media" Storage bucket.
 *
 * @param {File} file       the image file picked in <input type="file">
 * @param {string} userId   uploading user's auth id (used as folder)
 * @param {string} label    short label, e.g. "weighment-slip" or "arrival-proof"
 * @returns {Promise<string|null>} public URL, or null if no file was given
 */
export async function uploadShipmentMedia(file, userId, label) {
  if (!file) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("shipment-media")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("shipment-media").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a site branding asset (header logo, hero slide image/video) to the
 * public "site-media" Storage bucket and returns its public URL.
 *
 * @param {File} file      the file picked in <input type="file">
 * @param {string} folder  subfolder, e.g. "logo" or "slides"
 * @returns {Promise<string|null>}
 */
export async function uploadSiteMedia(file, folder = "misc") {
  if (!file) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("site-media")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl;
}
