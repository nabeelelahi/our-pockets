/** Shared artwork for generated PNG icons (rendered by next/og). */
export function AppIconArt({ size, padding = 0 }: { size: number; padding?: number }) {
  const inner = size - padding * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f7a5a" }}>
      <div
        style={{
          width: inner * 0.56,
          height: inner * 0.56,
          borderRadius: "50%",
          border: `${Math.round(inner * 0.07)}px solid #ffffff`,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "50%", height: "100%", background: "#ffffff" }} />
      </div>
    </div>
  );
}
