"use client";

import { useEffect, useState } from "react";
import { sameProvince, sameRegency } from "./regions.mjs";

export type Region = { id: string; name: string };

function useRegionList(path: string | undefined, label: string) {
  const [state, setState] = useState<{ path?: string; data: Region[]; loading: boolean; error: string }>({ data: [], loading: false, error: "" });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState({ path, data: [], loading: true, error: "" });
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/v2/${path}.json`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daftar wilayah belum dapat dimuat.");
        const payload = await response.json();
        if (!Array.isArray(payload.data) || payload.data.some((region: Region) => typeof region.id !== "string" || typeof region.name !== "string"))
          throw new Error("Format wilayah tidak valid.");
        if (!controller.signal.aborted) setState({ path, data: payload.data, loading: false, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ path, data: [], loading: false, error: `Daftar ${label} gagal dimuat. Pilih ulang wilayah di atasnya atau muat ulang halaman.` });
      });
    return () => controller.abort();
  }, [path, label]);
  // Do not expose the previous parent's options while the next request starts.
  if (!path) return { data: [] as Region[], loading: false, error: "" };
  return state.path === path ? state : { data: [] as Region[], loading: true, error: "" };
}

export function useRegions(provinceName: string, cityName = "", districtName = "") {
  const provinces = useRegionList("provinces", "provinsi");
  const provinceId = provinces.data.find((region) => sameProvince(region.name, provinceName))?.id;
  const regencies = useRegionList(provinceId ? `regencies/${provinceId}` : undefined, "kota/kabupaten");
  const cityId = (regencies.data.find((region) => region.name === cityName) || regencies.data.find((region) => sameRegency(cityName, region.name)))?.id;
  const districts = useRegionList(cityId ? `districts/${cityId}` : undefined, "kecamatan");
  const districtId = districts.data.find((region) => region.name === districtName)?.id;
  const villages = useRegionList(districtId ? `villages/${districtId}` : undefined, "kelurahan/desa");
  return {
    provinces: provinces.data, regencies: regencies.data, districts: districts.data, villages: villages.data,
    provincesLoading: provinces.loading, regenciesLoading: regencies.loading,
    districtsLoading: districts.loading, villagesLoading: villages.loading,
    error: provinces.error || regencies.error || districts.error || villages.error,
  };
}
