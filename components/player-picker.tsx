"use client";

// First-run identity picker. Locks the player in via localStorage so the rest
// of the app knows "this is your row, this is the Add my pick button."
// Hidden behind a Switch button in the header once chosen.

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/lib/useMe";
import { useBD } from "@/lib/useBD";
import { CLIP_MAX_MB, setPlayerClip, setPlayerPhoto, shrinkPhoto } from "@/lib/bd";
import { setSoundOn, soundOn } from "@/lib/sound";
import { fireMoment } from "./moments";
import type { Player } from "@/lib/types";
import { Avatar } from "./primitives";
import { Sheet } from "./sheet";

export function PlayerPicker({
  players,
  open,
  onClose,
}: {
  players: Player[];
  open: boolean;
  onClose: () => void;
}) {
  const { meId, me, setMeId } = useMe();
  const { reload } = useBD();
  const fileRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);
  const [sounds, setSounds] = useState(false);
  useEffect(() => setSounds(soundOn()), [open]);

  const saveClip = async (file: File | null) => {
    if (!meId) return;
    setBusy(true);
    setError(null);
    try {
      await setPlayerClip(meId, file);
      await reload();
    } catch (e) {
      setError((e as Error).message || "Couldn't save the clip");
    } finally {
      setBusy(false);
    }
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savePhoto = async (photo: string | null) => {
    if (!meId) return;
    setBusy(true);
    setError(null);
    try {
      await setPlayerPhoto(meId, photo);
      await reload();
    } catch (e) {
      setError((e as Error).message || "Couldn't save the photo");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Who's playing?">
      <p
        className="font-scribble mb-4"
        style={{ color: "var(--c-dim)", fontSize: 22, transform: "rotate(-1deg)" }}
      >
        pick yourself — we'll remember →
      </p>
      {/* Your own photo — replaces the initials circle everywhere. */}
      {me && (
        <div
          className="flex items-center gap-3 p-3 mb-4"
          style={{ border: "1.5px dashed var(--c-rule-strong)", borderRadius: 2 }}
        >
          <Avatar player={me} size={56} />
          <div className="flex-1 min-w-0">
            <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)", fontWeight: 600 }}>
              Your photo, {me.name}
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="font-stamp uppercase"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  padding: "8px 12px",
                  borderRadius: 2,
                  background: "var(--c-ink)",
                  color: "var(--c-paper)",
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {busy ? "Saving…" : me.photo ? "Change photo" : "Add a photo"}
              </button>
              {me.photo && !busy && (
                <button
                  onClick={() => void savePhoto(null)}
                  className="font-stamp uppercase"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    padding: "8px 12px",
                    borderRadius: 2,
                    border: "1.5px solid var(--c-ink)",
                    color: "var(--c-ink)",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {error && (
              <div className="font-mono mt-2" style={{ fontSize: 11, color: "var(--c-burgundy)" }}>
                ⚠ {error}
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await savePhoto(await shrinkPhoto(file));
              } catch (err) {
                setError((err as Error).message || "Couldn't read that picture");
              }
            }}
          />
        </div>
      )}
      {/* Celebration clip + sound effects. */}
      {me && (
        <div className="p-3 mb-4" style={{ border: "1.5px dashed var(--c-rule-strong)", borderRadius: 2 }}>
          <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)", fontWeight: 600 }}>
            Your celebration clip
          </div>
          <p className="font-body" style={{ fontSize: 13, color: "var(--c-ink-soft)", marginTop: 4 }}>
            A few seconds of video or a GIF. It plays when your pick wins, and on your gravestone when you kill the slip.
            Max {CLIP_MAX_MB} MB.
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={() => clipRef.current?.click()}
              disabled={busy}
              className="font-stamp uppercase"
              style={{ fontSize: 12, letterSpacing: "0.12em", padding: "8px 12px", borderRadius: 2, background: "var(--c-ink)", color: "var(--c-paper)", opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Saving…" : me.clip ? "Change clip" : "Add a clip"}
            </button>
            {me.clip && !busy && (
              <>
                <button
                  onClick={() => fireMoment("won", { player: me })}
                  className="font-stamp uppercase"
                  style={{ fontSize: 12, letterSpacing: "0.12em", padding: "8px 12px", borderRadius: 2, border: "1.5px solid var(--c-ink)", color: "var(--c-ink)" }}
                >
                  ▶ Preview
                </button>
                <button
                  onClick={() => void saveClip(null)}
                  className="font-stamp uppercase"
                  style={{ fontSize: 12, letterSpacing: "0.12em", padding: "8px 12px", borderRadius: 2, border: "1.5px solid var(--c-ink)", color: "var(--c-ink)" }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
          <input
            ref={clipRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void saveClip(file);
            }}
          />
          <label className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--c-rule)" }}>
            <input
              type="checkbox"
              checked={sounds}
              onChange={(e) => {
                setSounds(e.target.checked);
                setSoundOn(e.target.checked);
              }}
              style={{ width: 20, height: 20, accentColor: "var(--c-burgundy)" }}
            />
            <span>
              <span className="font-display block" style={{ fontSize: 16, color: "var(--c-ink)", lineHeight: 1.1 }}>
                Sound effects
              </span>
              <span className="font-mono uppercase block" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--c-dim)", marginTop: 2 }}>
                cash register · sad trombone · ref's whistle · this phone only
              </span>
            </span>
          </label>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setMeId(p.id);
              onClose();
            }}
            className="flex items-center gap-3 p-3 rounded border text-left transition"
            style={{
              borderColor: meId === p.id ? "var(--c-burgundy)" : "var(--c-rule)",
              background: meId === p.id ? "var(--c-bg2)" : "transparent",
            }}
          >
            <Avatar player={p} size={44} />
            <div className="flex-1 min-w-0">
              <div
                className="font-display"
                style={{ fontSize: 22, lineHeight: 1.05, color: "var(--c-ink)" }}
              >
                {p.name}
              </div>
              <div
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--c-dim)", marginTop: 2 }}
              >
                {p.persona ?? "—"}
              </div>
            </div>
            {meId === p.id && (
              <span
                className="font-stamp uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--c-burgundy)",
                  border: "1.5px solid var(--c-burgundy)",
                  padding: "3px 9px",
                  borderRadius: 2,
                }}
              >
                You
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
