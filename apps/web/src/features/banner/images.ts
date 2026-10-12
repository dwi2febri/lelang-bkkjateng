// Replace only the original bundled photos, including settings saved before
// the new artwork was introduced. Admin-uploaded images keep their own URLs.
const originalPhotos: Record<string, string> = {
  "photo-1600596542815-ffad4c1539a9": "/images/hero-catalog.webp",
  "photo-1497366754035-f200968a6e72": "/images/hero-assets.webp",
  "photo-1600585154340-be6161a56a0c": "/images/hero-home.webp",
};

export function resolveBannerImage(image: string) {
  try {
    const url = new URL(image);
    if (url.hostname === "images.unsplash.com") {
      return originalPhotos[url.pathname.slice(1)] || image;
    }
  } catch { /* Local image paths already point to the intended artwork. */ }
  return image;
}

export function isIllustratedBanner(image: string) {
  return Object.values(originalPhotos).includes(image);
}
