const aliases = {
  "DKI Jakarta": "Daerah Khusus Ibukota Jakarta",
  "DI Yogyakarta": "Daerah Istimewa Yogyakarta",
};

/** @param {string | null | undefined} a @param {string} b */
export function sameProvince(a, b) {
  return !!a && ((aliases[a] || a) === (aliases[b] || b));
}

/** @param {string} a @param {string} b */
export function sameRegency(a, b) {
  return a === b || a === b.replace(/^(Kabupaten|Kota) /, "");
}
