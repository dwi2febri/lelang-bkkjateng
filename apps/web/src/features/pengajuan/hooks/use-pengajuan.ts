"use client";
import { useEffect, useState } from "react";
import { pengajuanService } from "../services/pengajuan-service";
import type { Interest } from "../types";
import type { Paginated } from "@/types/global";
import { errorMessage } from "@/services/api";
export function usePengajuan(q: string, status: string, page: number) {
  const [result, setResult] = useState<Paginated<Interest>>({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    pengajuanService
      .list({ q, status: status || undefined, page }, controller.signal)
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, status, page, revision]);
  return { result, loading, error, reload: () => setRevision((x) => x + 1) };
}
