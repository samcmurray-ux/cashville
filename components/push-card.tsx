"use client";

// The "turn on notifications" card on Home. Each phone opts in for itself.

import { useEffect, useState } from "react";
import { useMe } from "@/lib/useMe";
import { Card, Eyebrow } from "./primitives";
import {
  currentSubscription,
  disablePush,
  enablePush,
  needsInstallFirst,
  pushSupported,
  syncPushPlayer,
} from "@/lib/push";

export function PushCard() {
  const { me, meId } = useMe();
  const [state, setState] = useState<"loading" | "unsupported" | "install" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      if (needsInstallFirst()) return live && setState("install");
      if (!pushSupported()) return live && setState("unsupported");
      const sub = await currentSubscription().catch(() => null);
      if (!live) return;
      setState(sub && Notification.permission === "granted" ? "on" : "off");
      if (sub && meId) void syncPushPlayer(meId);
    })();
    return () => {
      live = false;
    };
  }, [meId]);

  if (state === "loading" || state === "unsupported" || !me) return null;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (state === "on") {
        await disablePush();
        setState("off");
      } else {
        await enablePush(me.id);
        setState("on");
      }
    } catch (e) {
      setError((e as Error).message || "That didn't work");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card accent="var(--c-denim)">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow color="var(--c-denim)">Notifications</Eyebrow>
          <div className="font-body mt-1.5" style={{ fontSize: 14, color: "var(--c-ink)" }}>
            {state === "install"
              ? "On iPhone, add the app to your Home Screen first: tap Share, then Add to Home Screen, and open it from there."
              : state === "on"
                ? `On for ${me.name} on this phone.`
                : "Get a nudge for picks, results, fines and side bets."}
          </div>
          {error && (
            <div className="font-mono mt-1.5" style={{ fontSize: 11, color: "var(--c-burgundy)" }}>
              ⚠ {error}
            </div>
          )}
        </div>
        {state !== "install" && (
          <button
            onClick={toggle}
            disabled={busy}
            className="font-stamp uppercase shrink-0"
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "10px 12px",
              borderRadius: 2,
              border: "1.5px solid var(--c-ink)",
              background: state === "on" ? "transparent" : "var(--c-ink)",
              color: state === "on" ? "var(--c-ink)" : "var(--c-paper)",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : state === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
    </Card>
  );
}
