"use client";

import { useEffect, useMemo, useState } from "react";
import { sameProvince } from "./regions.mjs";

export type Region = { id: string; name: string };

async function readRegions(path: string, signal: AbortSignal): Promise<Region[]> {
  const response = await fetch(
    `https://www.emsifa.com/api-wilayah-indonesia/v2/${path}.json`,
    { signal, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Daftar wilayah belum dapat dimuat.");
  const payload = (await response.json()) as { data?: Region[] };
  if (!Array.isArray(payload.data)) throw new Error("Format data wilayah tidak valid.");
  return payload.data;
}

export function useRegions(provinceName: string) {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setProvincesLoading(true);
    readRegions("provinces", controller.signal)
      .then((data) => {
        setProvinces(data);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Daftar provinsi gagal dimuat. Muat ulang halaman untuk mencoba lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvincesLoading(false);
      });
    return () => controller.abort();
  }, []);

  const provinceId = useMemo(
    () => provinces.find((region) => sameProvince(region.name, provinceName))?.id,
    [provinces, provinceName],
  );

  useEffect(() => {
    if (!provinceId) {
      setRegencies([]);
      setRegenciesLoading(false);
      return;
    }
    const controller = new AbortController();
    setRegencies([]);
    setRegenciesLoading(true);
    readRegions(`regencies/${provinceId}`, controller.signal)
      .then((data) => {
        setRegencies(data);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Daftar kota/kabupaten gagal dimuat. Coba pilih provinsi lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegenciesLoading(false);
      });
    return () => controller.abort();
  }, [provinceId]);

  return { provinces, regencies, provincesLoading, regenciesLoading, error };
}
