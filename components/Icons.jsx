/**
 * Smart Goods Transport Company — shared icon set.
 *
 * A large majority of merchants and drivers on this platform are more
 * comfortable recognising a picture than reading English/Urdu labels, so
 * every icon here is designed to be understood on its own — simple,
 * bold, line-based, and consistent (24x24 grid, currentColor stroke).
 *
 * Usage: <TruckIcon className="w-6 h-6" />
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function TruckIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M2 8h11v9H2z" />
      <path d="M13 11h4l4 3.2V17h-8z" />
      <circle cx="6.5" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M2 11h5" />
    </svg>
  );
}

export function TruckCheckIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M1.5 8h10v9h-10z" />
      <path d="M11.5 11h4l3.5 3v3h-7.5z" />
      <circle cx="6" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="5" r="3.4" className="fill-white" strokeWidth="1.6" />
      <path d="M18.6 5l1 1 1.8-2" strokeWidth="1.6" />
    </svg>
  );
}

export function ConnectIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="6" cy="7" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M8.5 8.8 15.5 15.2" />
      <path d="M17 13.5 20 17l-3.5 1" />
    </svg>
  );
}

export function ScaleIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v18" />
      <path d="M6 6h12" />
      <path d="M3 6l3-2 3 2" />
      <path d="M15 6l3-2 3 2" />
      <path d="M2 6l2.5 5.5a2.7 2.7 0 0 0 5 0L12 6" />
      <path d="M13 6l2.5 5.5a2.7 2.7 0 0 0 5 0L23 6" />
      <path d="M9 21h6" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function LockIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="4" y="10.5" width="16" height="10" rx="1.6" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 16.4V18" />
    </svg>
  );
}

export function DocumentCheckIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M14 2.5V7h4" />
      <path d="M8 12.5h4" />
      <path d="M8 16h3" />
      <path d="M8.5 9h3" />
      <circle cx="16.5" cy="16.5" r="3.3" className="fill-white" strokeWidth="1.6" />
      <path d="M15.1 16.6l1 1 2-2.1" strokeWidth="1.6" />
    </svg>
  );
}

export function ComputerUserIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="2.5" y="4" width="19" height="13" rx="1.4" />
      <path d="M9 20.5h6" />
      <path d="M12 17v3.5" />
      <circle cx="12" cy="8.6" r="2" />
      <path d="M8.3 13.4a3.9 3.9 0 0 1 7.4 0" />
    </svg>
  );
}

export function PhoneCheckIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 19h4" />
      <circle cx="17" cy="8" r="3.4" className="fill-white" strokeWidth="1.6" />
      <path d="M15.6 8.1l1 1 2-2.1" strokeWidth="1.6" />
    </svg>
  );
}

export function RouteIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="5" cy="6" r="2.3" />
      <circle cx="19" cy="18" r="2.3" />
      <path d="M6.8 7.6C10 10 8 13 12 13.5s3 4 5 5" strokeDasharray="2.5 3" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5-4.6-1.3-8-4.5-8-9.5V6z" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.9" />
    </svg>
  );
}

export function WalletIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5" />
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M16 13.5h3v2h-3a1 1 0 1 1 0-2z" />
    </svg>
  );
}

export function StarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2.8l2.9 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.9 3.4 1.4-6.4-4.9-4.4 6.5-.7z" />
    </svg>
  );
}

export function MapPinIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function PhoneIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5 4.5h3.5l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5V18a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" />
    </svg>
  );
}

export function MailIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M3 6.5l9 6.5 9-6.5" />
    </svg>
  );
}

export function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.6-.9-2.1-.2-.6-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.3-.2-.6-.3z" />
      <path d="M12 2.2A9.8 9.8 0 0 0 2.2 12c0 1.7.5 3.4 1.3 4.8L2 22l5.3-1.4a9.8 9.8 0 0 0 4.7 1.2A9.8 9.8 0 0 0 21.8 12 9.8 9.8 0 0 0 12 2.2zm0 17.8c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.9-3-.2-.3A8 8 0 1 1 20 12a8 8 0 0 1-8 8z" />
    </svg>
  );
}

export function IdCardIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5.3 16c.4-1.6 1.6-2.4 2.7-2.4s2.3.8 2.7 2.4" />
      <path d="M14 9.5h5" />
      <path d="M14 13h5" />
      <path d="M14 16.5h3" />
    </svg>
  );
}

export function LicenseIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="7.5" cy="12" r="1.8" />
      <path d="M12.5 9.5h6" />
      <path d="M12.5 12h6" />
      <path d="M12.5 14.5h4" />
    </svg>
  );
}

export function PermitIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 2.5 4 5.5v6C4 16 7.4 19.3 12 21c4.6-1.7 8-5 8-9.5v-6z" />
      <path d="M9 11.5h6" />
      <path d="M9 14.5h4" />
    </svg>
  );
}

export function CalendarIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function UserIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c1-3.6 3.7-5.5 6.5-5.5s5.5 1.9 6.5 5.5" />
    </svg>
  );
}

export function HomeIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

export function GridIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  );
}

export function InfoIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LoginIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M10 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4" />
      <path d="M14 16l4.5-4-4.5-4" />
      <path d="M18.3 12H8.5" />
    </svg>
  );
}

export function MenuIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </svg>
  );
}

export function CloseIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M5 5l14 14" />
      <path d="M19 5 5 19" />
    </svg>
  );
}

export function BellIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ClockIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.5 2" />
    </svg>
  );
}

export function ArrowRightIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 12h16" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}

export function PlusIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CottonIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 21c0-4-3-4.5-3-8a3 3 0 0 1 6 0c0 3.5-3 4-3 8z" />
      <circle cx="7" cy="9.5" r="3" />
      <circle cx="17" cy="9.5" r="3" />
      <circle cx="12" cy="6" r="3" />
    </svg>
  );
}

export function WheatIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M12 22V6" />
      <path d="M12 6c-1.5 0-2.5-1-2.5-2.5S10.5 1 12 1s2.5 1 2.5 2.5S13.5 6 12 6z" />
      <path d="M9 9l-2.5-1.5" />
      <path d="M9 9l2.5 1" />
      <path d="M15 9l2.5-1.5" />
      <path d="M15 9l-2.5 1" />
      <path d="M9 13l-2.5-1.5" />
      <path d="M9 13l2.5 1" />
      <path d="M15 13l2.5-1.5" />
      <path d="M15 13l-2.5 1" />
    </svg>
  );
}

export function ChartIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4" />
      <path d="M12.5 16V8" />
      <path d="M17 16v-6.5" />
    </svg>
  );
}

export function FilterIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

export function LogoutIcon({ className }) {
  return (
    <svg className={className} {...base}>
      <path d="M14 3.5h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4.5 4L10 16" />
      <path d="M5.7 12H15.5" />
    </svg>
  );
}
