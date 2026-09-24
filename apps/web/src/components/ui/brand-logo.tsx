import Image from "next/image";

export function BrandLogo() {
  return (
    <Image
      src="/logo/bkk-lelang-v2.png"
      alt="BKK Jawa Tengah — Lelang & Katalog Aset"
      width={2172}
      height={724}
      sizes="(max-width: 560px) 190px, 270px"
      className="brand-logo"
    />
  );
}
