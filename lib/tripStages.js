import { TruckCheckIcon, BoxIcon, DocumentCheckIcon, RouteIcon, MapPinIcon, UnloadIcon, CheckCircleIcon, WalletIcon } from "@/components/Icons";

/**
 * The 8-step granular journey a driver walks through after accepting a load.
 * `status` is the coarse value written back to `loads.status` at that stage,
 * so merchant-side tab filtering (Waiting/Accepted/On Way) and the nearby
 * loads matching RPC keep working unchanged.
 */
export const TRIP_STAGES = [
  { value: 1, label: "Load Accepted", icon: TruckCheckIcon, status: "assigned" },
  { value: 2, label: "Loading", icon: BoxIcon, status: "assigned" },
  { value: 3, label: "Documentation", icon: DocumentCheckIcon, status: "assigned" },
  { value: 4, label: "On the Way", icon: RouteIcon, status: "in_transit" },
  { value: 5, label: "Reached at Destination", icon: MapPinIcon, status: "in_transit" },
  { value: 6, label: "Unloading", icon: UnloadIcon, status: "in_transit" },
  { value: 7, label: "Unloaded", icon: CheckCircleIcon, status: "in_transit" },
  { value: 8, label: "Rent Received", icon: WalletIcon, status: "delivered" },
];

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
  if (load.trip_stage) return load.trip_stage;
  if (load.status === "delivered") return 8;
  if (load.status === "in_transit") return 4;
  if (load.status === "assigned") return 1;
  return 0;
}
