import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Smart Goods Transport Company",
  description:
    "Pakistan's smartest commercial goods transport network — connecting verified truck drivers with commodity loads.",
};

// Footer fetches admin-managed contact info/social links on every page.
// Forcing dynamic rendering here (once, at the root) guarantees that data
// is always fresh across every route, not just the homepage/contact page.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-[70vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
