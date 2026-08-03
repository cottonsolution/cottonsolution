/**
 * Simple, transparent base-fare suggestion used by the "Post a Load" form
 * (functional requirement #1): flat base charge + a per-km rate, scaled by
 * truck size. This is only a *starting suggestion* — the merchant can
 * always edit it before posting, and drivers can counter-bid on top of it.
 *
 * No commission / wallet math lives here — this project intentionally does
 * NOT include an in-app wallet or commission system yet, per the current
 * scope.
 *
 * These numbers are plain constants for now so they're easy to find and
 * tune in one place. If/when this needs to be admin-editable, the natural
 * next step is a `fare_rates` CMS table following the same pattern as
 * `public.vehicle_types` / `public.quantity_units` elsewhere in this app.
 */
export const FARE_CONFIG = {
  baseFarePkr: 1500, // flat pickup/dispatch charge, PKR
  perKmPkr: 60, // PKR per km at the "6 Wheeler" baseline
  minFarePkr: 2000,
  vehicleMultiplier: {
    Mazda: 0.75,
    "6 Wheeler": 1,
    "10 Wheeler": 1.35,
    "18 Wheeler (Trailer)": 1.8,
    "22 Wheeler (Trailer)": 2.1,
  },
};

/**
 * @param {number} distanceKm
 * @param {string} [vehicleTypeName] - e.g. "10 Wheeler"; defaults to 1x
 * @returns {number} suggested base fare in PKR, rounded to the nearest 50
 */
export function estimateFare(distanceKm, vehicleTypeName) {
  if (!distanceKm || distanceKm <= 0) return 0;
  const multiplier = FARE_CONFIG.vehicleMultiplier[vehicleTypeName] ?? 1;
  const raw = FARE_CONFIG.baseFarePkr + distanceKm * FARE_CONFIG.perKmPkr * multiplier;
  const rounded = Math.round(Math.max(raw, FARE_CONFIG.minFarePkr) / 50) * 50;
  return rounded;
}
