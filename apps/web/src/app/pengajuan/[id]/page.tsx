import { PengajuanDetail } from "@/features/pengajuan/components/pengajuan-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PengajuanDetail id={id} />;
}
