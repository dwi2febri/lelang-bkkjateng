import { AsetForm } from "@/features/aset/components/aset-form";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AsetForm id={id} />;
}
