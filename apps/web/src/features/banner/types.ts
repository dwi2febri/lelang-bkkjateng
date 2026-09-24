export type BannerSlide = {
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  action: string;
  href: string;
  note: string;
  caption: string;
  trustFirst: string;
  trustSecond: string;
};
export type BannerSettings = { slides: BannerSlide[]; version: number };
