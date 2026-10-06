"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function scrollToPageStart() {
  // Let explicit section links (for example #minat) keep their destination.
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}

export function NavigationScroll() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.addEventListener("pageshow", scrollToPageStart);
    return () => {
      window.history.scrollRestoration = previous;
      window.removeEventListener("pageshow", scrollToPageStart);
    };
  }, []);

  useLayoutEffect(() => {
    scrollToPageStart();
    // Apply once after the router's own scroll/focus handling has finished.
    // Do not run on data refreshes or while the visitor scrolls the same page.
    const frame = window.requestAnimationFrame(scrollToPageStart);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  return null;
}
