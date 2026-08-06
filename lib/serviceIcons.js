import {
  ConnectIcon,
  ScaleIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  RouteIcon,
  WalletIcon,
  TruckIcon,
  BellIcon,
} from "@/components/Icons";

/**
 * Maps a service's title (as stored in Supabase) to a recognisable icon.
 * Falls back to a generic truck icon so nothing ever renders as a bare
 * letter — important for merchants/drivers who scan by picture, not text.
 */
const RULES = [
  { test: /connect|match|load.*truck/i, icon: ConnectIcon },
  { test: /kanda|weight|scale/i, icon: ScaleIcon },
  { test: /bilty|document|receipt/i, icon: DocumentCheckIcon },
  { test: /verif|trust|shield|secure/i, icon: ShieldCheckIcon },
  { test: /route|track|gps|location/i, icon: RouteIcon },
  { test: /pay|wallet|fare|price/i, icon: WalletIcon },
  { test: /alert|notif|remind|expiry/i, icon: BellIcon },
];

export function getServiceIcon(title = "") {
  const match = RULES.find((r) => r.test.test(title));
  return match ? match.icon : TruckIcon;
}
