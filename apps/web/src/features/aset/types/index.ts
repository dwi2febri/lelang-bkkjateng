export type Asset = {
  id: number;
  slug: string;
  code: string;
  title: string;
  category: string;
  saleMethod: string;
  province: string | null;
  city: string;
  address: string;
  price: number;
  oldPrice: number | null;
  land: number;
  building: number;
  bedrooms: number;
  image: string;
  auctionDate: string;
  certificate: string;
  description: string;
  featured: number;
  archived: number;
};
export type AssetInput = Omit<Asset, "id" | "archived" | "featured"> & {
  featured: boolean;
};
