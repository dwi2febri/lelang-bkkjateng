"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
const internal = ["/recycle-bin","/dashboard","/aset","/pengajuan","/approval","/master-kategori","/master-produk-kredit","/kelola-banner","/kelola-panduan","/manajemen-user","/log-user"];
export function PresenceTracker() {
  const path = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function beat() {
      if (document.visibilityState !== "visible" || pending || path === "/login") return;
      pending = true;
      try {
        await fetch("/api/presence", {method:"POST",credentials:"same-origin",signal:controller.signal,
          headers:{"Content-Type":"application/json","X-Requested-With":"BKKPublic"},
          body:JSON.stringify({kind:internal.some(prefix=>path===prefix||path.startsWith(prefix+"/"))?"internal":"external",path:path.slice(0,250)})});
      } catch { /* Presence must not block browsing. */ }
      finally { pending = false; }
    }
    void beat();
    const timer = setInterval(beat,15000);
    document.addEventListener("visibilitychange",beat);
    return () => {clearInterval(timer);controller.abort();document.removeEventListener("visibilitychange",beat);};
  },[path]);
  return null;
}
