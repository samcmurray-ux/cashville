// Splash for the loading.tsx and for the first-render gap in the (app) shell.
// Matches the LoadingScreen from supabase-app.jsx in the prototype.

export function LoadingScreen({ label = "Loading the slip…" }: { label?: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--c-bg)" }}
    >
      <div className="text-center">
        <div
          className="font-display"
          style={{ fontSize: 48, fontStyle: "italic", color: "var(--c-burgundy)" }}
        >
          Ca<span style={{ color: "var(--c-mustard)" }}>$</span>hville
        </div>
        <div
          className="font-scribble mt-1.5"
          style={{ fontSize: 22, color: "var(--c-dim)", transform: "rotate(-1deg)" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
