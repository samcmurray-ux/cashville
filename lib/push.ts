"use client";

// Push notifications, phone side. Turning them on registers the service
// worker, asks the phone for permission, and saves this phone's address
// against the player. Sending is done by the Supabase "push" function —
// notify() just tells it what happened.

import { sb } from "./supabase";

export type PushEvent =
  | { kind: "test"; playerId: string }
  | { kind: "pick_in"; week: number; playerId: string; actorId: string | null }
  | { kind: "killed"; week: number; playerId: string; actorId: string | null }
  | { kind: "landed"; week: number; actorId: string | null }
  | { kind: "fined"; week: number | null; playerId: string; fineKind: string; actorId: string | null }
  | { kind: "side_bet_offer"; betId: string }
  | { kind: "side_bet_reply"; betId: string }
  | { kind: "vote"; week: number; voterId: string; targetId: string; voteKind: string };

// Fire and forget: a failed notification must never break the action that
// triggered it.
export function notify(event: PushEvent) {
  void sb()
    .functions.invoke("push", { body: { type: "event", event } })
    .catch(() => {});
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// iPhones only allow notifications once the app is on the home screen.
export function needsInstallFirst(): boolean {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js");
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function save(sub: PushSubscription, playerId: string) {
  const j = sub.toJSON();
  const { error } = await sb()
    .from("push_subscriptions")
    .upsert(
      { player_id: playerId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function enablePush(playerId: string) {
  if (!pushSupported()) throw new Error("This browser can't do notifications");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked for this site — allow them in the phone's settings");
  }
  const { data, error } = await sb().functions.invoke("push", { body: { type: "config" } });
  if (error || !data?.publicKey) throw new Error("Couldn't reach the notification service");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) }));
  await save(sub, playerId);
  notify({ kind: "test", playerId });
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await sb().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

// Keep this phone pointed at whoever is using it (after "switch player").
export async function syncPushPlayer(playerId: string) {
  const sub = await currentSubscription();
  if (sub) await save(sub, playerId).catch(() => {});
}
