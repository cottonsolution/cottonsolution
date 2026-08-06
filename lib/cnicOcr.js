"use client";

/**
 * Runs OCR on a CNIC image and pulls out whatever it can confidently find.
 *
 * Honest expectation-setting: NADRA CNIC cards mix small print, a security
 * background pattern, and Urdu + English text, so free in-browser OCR is
 * NOT reliable for names/addresses. What Tesseract *is* good at is fixed,
 * high-contrast numeric patterns — so this only auto-fills the CNIC number
 * (format 00000-0000000-0) and, if found, a date-shaped string for the
 * expiry date. Everything else stays a manual field, which the wizard UI
 * already expects ("auto-extract where possible, with manual edit option").
 */
export async function scanCnicImage(file, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);

    const cnicMatch = text.match(/\d{5}-\d{7}-\d{1}/);
    // Loose date matcher: dd-mm-yyyy, dd/mm/yyyy, or dd.mm.yyyy
    const dateMatches = [...text.matchAll(/\b(\d{2})[.\-/](\d{2})[.\-/](\d{4})\b/g)];

    return {
      rawText: text,
      cnicNumber: cnicMatch ? cnicMatch[0] : null,
      // NADRA cards print Date of Birth, Issue Date, and Expiry Date close
      // together, usually in that order — this is a best-effort guess the
      // person should double-check, never trust blindly.
      possibleDates: dateMatches.map((m) => `${m[1]}-${m[2]}-${m[3]}`),
    };
  } finally {
    await worker.terminate();
  }
}
