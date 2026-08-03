"use client";

import { supabase } from "@/lib/supabaseBrowserClient";
import { uploadShipmentMedia } from "@/lib/uploadDocument";
import { triggerPush } from "@/lib/pushClient";
import { statusForStage } from "@/lib/tripStages";

async function setTripStage(loadId, stage) {
  return supabase
    .from("loads")
    .update({ trip_stage: stage, status: statusForStage(stage) })
    .eq("id", loadId)
    .select()
    .maybeSingle();
}

/** Stage 1 -> 2: driver begins the Documentation step. */
export async function startDocumentation(loadId) {
  return setTripStage(loadId, 2);
}

/** Driver uploads the weighment slip ("kande ki parchi") during Documentation. */
export async function uploadWeighmentSlip({ load, file, driverId, merchantId }) {
  const url = await uploadShipmentMedia(file, driverId, "weighment-slip");
  await supabase.from("loads").update({ weighment_slip_url: url }).eq("id", load.id);
  triggerPush({
    userId: merchantId,
    title: "Weighment slip received",
    body: `${load.commodity} — driver uploaded the slip. Please review and submit the Bilty.`,
    url: "/merchant/dashboard",
    tag: `load-${load.id}`,
  });
  return url;
}

/** Merchant fills in and submits the Bilty for a load. */
export async function submitBilty({ biltyId, fields, load, driverId }) {
  await supabase
    .from("biltys")
    .update({ ...fields, status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", biltyId);
  if (driverId) {
    triggerPush({
      userId: driverId,
      title: "Bilty ready",
      body: `${load.commodity} — the merchant submitted your Bilty. View, print, and start your trip.`,
      url: "/driver/dashboard",
      tag: `load-${load.id}`,
      urgent: true,
    });
  }
}

/** Stage 2 -> 3: driver starts the trip once the Bilty is submitted. */
export async function markOnTheWay({ load, merchantId }) {
  await setTripStage(load.id, 3);
  triggerPush({
    userId: merchantId,
    title: "Truck is on the way",
    body: `${load.commodity} has left for ${load.dropoff_location}. You can track it live.`,
    url: "/merchant/dashboard",
    tag: `load-${load.id}`,
  });
}

/** Stage 3 -> 4: driver uploads an arrival photo when reaching the destination. */
export async function uploadArrivalProof({ load, file, driverId, merchantId }) {
  const url = await uploadShipmentMedia(file, driverId, "arrival-proof");
  await supabase
    .from("loads")
    .update({ delivery_proof_url: url, trip_stage: 4, status: "in_transit" })
    .eq("id", load.id);
  triggerPush({
    userId: merchantId,
    title: "Truck reached destination",
    body: `${load.commodity} has arrived at ${load.dropoff_location} — please review and approve.`,
    url: "/merchant/dashboard",
    tag: `load-${load.id}`,
    urgent: true,
  });
  return url;
}

/** Merchant approves the arrival — unlocks "Rent Received" for the driver. */
export async function approveArrival({ load, driverId }) {
  await supabase.from("loads").update({ merchant_approved_at: new Date().toISOString() }).eq("id", load.id);
  triggerPush({
    userId: driverId,
    title: "Delivery approved",
    body: `${load.commodity} delivery approved. You can now mark rent received to close the trip.`,
    url: "/driver/dashboard",
    tag: `load-${load.id}`,
    urgent: true,
  });
}

/** Stage 4 -> 5: driver closes the trip once approved. */
export async function markRentReceived(load) {
  return setTripStage(load.id, 5);
}

/** Called right after a driver accepts a load — rings the merchant. */
export async function notifyMerchantLoadAccepted({ load, merchantId, vehicle }) {
  triggerPush({
    userId: merchantId,
    title: "A driver accepted your load!",
    body: `${vehicle?.driver_name || "A driver"} (${vehicle?.vehicle_no || ""}) accepted your ${load.commodity} shipment.`,
    url: "/merchant/dashboard",
    tag: `load-${load.id}`,
    urgent: true,
  });
}
