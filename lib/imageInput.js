"use client";

/**
 * Reads a <input type="file"> change event and returns the picked File, or
 * null if the user cancelled. Small helper shared by every photo-upload
 * step (weighment slip, arrival proof) to keep the components terse.
 */
export function pickedFile(e) {
  return e.target.files?.[0] || null;
}
