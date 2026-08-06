import { ClockIcon, TruckCheckIcon, DocumentCheckIcon, RouteIcon, MapPinIcon, WalletIcon } from "@/components/Icons";

/**
 * The 6-step journey a load goes through, shared identically by both the
 * Driver dashboard (My Trips / Work Task Bar) and the Merchant dashboard
 * (Active Shipments) so both sides always see the exact same step, live.
 *
 * `status` is the coarse value written back to `loads.status` at that stage,
 * so tab filtering and the nearby-loads matching RPC keep working unchanged.
 *
 * 0 Waiting for Truck   — posted, no driver yet (merchant-only, pre-accept)
 * 1 Load Accepted       — a driver accepted; merchant gets a call-style alert
 * 2 Documentation       — driver uploads weighment slip, merchant fills +
 *                         submits the Bilty, driver views/prints it
 * 3 On the Way          — merchant live-tracks the truck by GPS
 * 4 Reached Destination — driver uploads arrival photo; merchant approves
 * 5 Rent Received       — unlocked only after merchant's approval
 */
export const TRIP_STAGES = [
  { value: 0, label: "Waiting for Truck", icon: ClockIcon, status: "open" },
  { value: 1, label: "Load Accepted", icon: TruckCheckIcon, status: "assigned" },
  { value: 2, label: "Documentation", icon: DocumentCheckIcon, status: "assigned" },
  { value: 3, label: "On the Way", icon: RouteIcon, status: "in_transit" },
  { value: 4, label: "Reached Destination", icon: MapPinIcon, status: "in_transit" },
  { value: 5, label: "Rent Received", icon: WalletIcon, status: "delivered" },
];

export const MAX_STAGE = TRIP_STAGES.length - 1; // 5

export function stageMeta(stageValue) {
  return TRIP_STAGES.find((s) => s.value === stageValue) ?? TRIP_STAGES[0];
}

export function statusForStage(stageValue) {
  return stageMeta(stageValue).status;
}

/**
 * Legacy-safe stage number for a load: uses trip_stage when set, otherwise
 * infers a reasonable stage from the old coarse `status` column so loads
 * created before this feature existed still render sensibly.
 */
export function effectiveStage(load) {
  if (load.trip_stage != null) return load.trip_stage;
  if (load.status === "delivered") return 5;
  if (load.status === "in_transit") return 3;
  if (load.status === "assigned") return 1;
  return 0;
}
