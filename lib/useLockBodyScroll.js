"use client";

import { useEffect } from "react";

/**
 * Locks the page's own scroll while `active` is true — this is what a
 * fixed-position modal needs so it can never end up visually offset from
 * where the page happens to be scrolled to underneath it (e.g. opening a
 * modal from an entry near the bottom of a long list would otherwise leave
 * the modal looking like it "jumped" down with empty space above it).
 *
 * Restores the exact previous scroll position when the modal closes.
 */
export function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return undefined;
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prevPosition = style.position;
    const prevTop = style.top;
    const prevWidth = style.width;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      style.position = prevPosition;
      style.top = prevTop;
      style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
