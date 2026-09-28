import CatalogPage from "@/features/catalog/components/catalog-page";
import { SubmissionHistoryPage } from "@/features/catalog/components/submission-history-page";

export const metadata = { title: "History Pengajuan | BKK Jateng" };

export default function Page() {
  return <CatalogPage historyPage><SubmissionHistoryPage /></CatalogPage>;
}
