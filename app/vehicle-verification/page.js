import VehicleSearch from "@/components/VehicleSearch";

export const metadata = { title: "Vehicle Verification | Smart Goods Transport Company" };

export default function VehicleVerificationPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-brand-navy mb-3">Vehicle Verification Portal</h1>
      <p className="text-slate-500 mb-10">
        Enter a vehicle number to view its complete legal and operational record — mobile number,
        driver CNIC, driving licence, and route permit, along with each document&apos;s expiry status.
      </p>
      <VehicleSearch />
    </section>
  );
}
