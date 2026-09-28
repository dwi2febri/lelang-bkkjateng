import CatalogPage from "@/features/catalog/components/catalog-page";
import { PublicAccountPage } from "@/features/catalog/components/public-account-page";
export const metadata = { title: "Masuk Akun | BKK Jateng" };
export default function Page() { return <CatalogPage historyPage><PublicAccountPage mode="login" /></CatalogPage>; }
