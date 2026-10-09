"use client";

import { useLayoutEffect, useRef } from "react";
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
  const route = `${pathname}?${search}`;
  const previousRoute = useRef(route);

  useLayoutEffect(() => {
    // Preserve the browser's saved position on reload, including while async
    // content grows. Only an actual route change should reset the viewport.
    window.history.scrollRestoration = "auto";
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    scrollToPageStart();
    // Apply once after the router's own scroll/focus handling has finished.
    // Do not run on data refreshes or while the visitor scrolls the same page.
    const frame = window.requestAnimationFrame(scrollToPageStart);
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  return null;
}
