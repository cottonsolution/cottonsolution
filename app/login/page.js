import LoginClient from "./LoginClient";

// Only login + the 3 dashboards link the manifest (installable PWA) — the
// public marketing pages (home, services, about, contact) intentionally do
// not, since Next.js metadata can only be exported from a Server Component
// and LoginClient itself is "use client" (needs useState/useRouter), this
// thin server wrapper is what actually carries the metadata.
export const metadata = {
  manifest: "/manifest.json",
  icons: { apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SGTC" },
};

export const viewport = {
  themeColor: "#0e3b2e",
};

export default function LoginPage() {
  return <LoginClient />;
}
