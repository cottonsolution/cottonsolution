import {
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  WhatsAppIcon,
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  XIcon,
} from "@/components/Icons";
import { supabase } from "@/lib/supabaseClient";

export const metadata = { title: "Contact Us | Smart Goods Transport Company" };

// Contact details are managed live from Admin Dashboard > Contact, so this
// page must always fetch fresh data instead of a cached build-time copy.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_CONTACT = {
  address: "Multan, Punjab, Pakistan",
  phone: "+92 300 0000000",
  whatsapp_number: "+92 300 0000000",
  email: "support@smartgoodstransport.pk",
  facebook_url: null,
  instagram_url: null,
  youtube_url: null,
  x_url: null,
};

async function getContactInfo() {
  try {
    const { data } = await supabase.from("contact_info").select("*").eq("id", 1).single();
    return data ?? FALLBACK_CONTACT;
  } catch (e) {
    return FALLBACK_CONTACT;
  }
}

function whatsappLink(number) {
  const digits = (number || "").replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}

const SOCIAL_LINKS_META = [
  { key: "facebook_url", label: "Facebook", icon: FacebookIcon },
  { key: "instagram_url", label: "Instagram", icon: InstagramIcon },
  { key: "youtube_url", label: "YouTube", icon: YoutubeIcon },
  { key: "x_url", label: "X (Twitter)", icon: XIcon },
];

export default async function ContactPage() {
  const contact = await getContactInfo();

  const CONTACT_POINTS = [
    { icon: MapPinIcon, label: "Office", value: contact.address },
    { icon: PhoneIcon, label: "Phone", value: contact.phone, href: `tel:${(contact.phone || "").replace(/\s+/g, "")}` },
    { icon: WhatsAppIcon, label: "WhatsApp Support", value: contact.whatsapp_number, href: whatsappLink(contact.whatsapp_number), accent: "text-green-500" },
    { icon: MailIcon, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
  ];

  const activeSocials = SOCIAL_LINKS_META.filter((s) => contact[s.key]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {CONTACT_POINTS.map((c) => {
          const content = (
            <div className="card flex items-center gap-4 h-full hover:shadow-pop transition-shadow">
              <span className={`icon-badge bg-brand-orange/10 rounded-xl w-12 h-12 shrink-0 ${c.accent ?? "text-brand-orange"}`}>
                <c.icon className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide">{c.label}</p>
                <p className="font-semibold text-brand-navy truncate">{c.value}</p>
              </div>
            </div>
          );
          return c.href ? (
            <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {content}
            </a>
          ) : (
            <div key={c.label}>{content}</div>
          );
        })}
      </div>

      {activeSocials.length > 0 && (
        <div className="flex items-center gap-3 mb-12">
          <p className="text-sm font-semibold text-brand-navy">Follow us:</p>
          <div className="flex items-center gap-3">
            {activeSocials.map((s) => (
              <a
                key={s.key}
                href={contact[s.key]}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="icon-badge bg-brand-orange/10 text-brand-orange rounded-full w-10 h-10 hover:bg-brand-orange hover:text-white transition-colors"
              >
                <s.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      )}

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
