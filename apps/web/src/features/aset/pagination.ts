export function assetPage<T>(items: T[], requestedPage: number, pageSize: string) {
  const size = pageSize === "all" ? Math.max(1, items.length) : Math.max(1, Number(pageSize) || 10);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pages, Math.max(1, requestedPage));
  const offset = (page - 1) * size;
  return {
    page,
    pages,
    rows: items.slice(offset, offset + size),
    from: items.length ? offset + 1 : 0,
    to: Math.min(offset + size, items.length),
  };
}
