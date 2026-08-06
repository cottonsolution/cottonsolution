import AdminDashboardClient from "./AdminDashboardClient";

export const metadata = {
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SGTC Admin" },
};

export const viewport = {
  themeColor: "#0e3b2e",
};

export default function Page() {
  return <AdminDashboardClient />;
}
