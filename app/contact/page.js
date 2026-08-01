import { PhoneIcon, MailIcon, MapPinIcon, ClockIcon } from "@/components/Icons";

export const metadata = { title: "Contact Us | Smart Goods Transport Company" };

const CONTACT_POINTS = [
  { icon: PhoneIcon, label: "Phone", value: "+92 300 1234567" },
  { icon: MailIcon, label: "Email", value: "support@smartgoodstransport.pk" },
  { icon: MapPinIcon, label: "Office", value: "Multan, Punjab, Pakistan" },
  { icon: ClockIcon, label: "Support Hours", value: "Mon – Sat, 9:00 AM – 7:00 PM" },
];

export default function ContactPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <span className="section-eyebrow">
        <MailIcon className="w-3.5 h-3.5" /> Get in Touch
      </span>
      <h1 className="text-3xl font-bold text-brand-navy mb-3">Contact Us</h1>
      <p className="text-slate-500 mb-10 max-w-xl">
        Have a question about posting a load, registering your truck, or verifying a vehicle?
        Reach out — our team responds the same business day.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        {CONTACT_POINTS.map((c) => (
          <div key={c.label} className="card flex items-center gap-4">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange rounded-xl w-12 h-12 shrink-0">
              <c.icon className="w-6 h-6" />
            </span>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className="font-semibold text-brand-navy">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-brand-navy mb-4">Send us a message</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Your Name" className="field-input" />
            <input placeholder="Mobile No" className="field-input" />
          </div>
          <input placeholder="Email Address" type="email" className="field-input" />
          <textarea rows={4} placeholder="How can we help?" className="field-input resize-y" />
          <button type="button" className="btn-orange w-full">
            Send Message
          </button>
          <p className="text-xs text-slate-400">
            This form is a placeholder — connect it to your preferred email or CRM service when ready.
          </p>
        </form>
      </div>
    </section>
  );
}
