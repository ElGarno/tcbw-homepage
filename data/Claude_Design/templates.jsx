/* global React */
const { useState } = React;

/* ─────────────────────────────────────────────
   SHARED PRIMITIVES
   ───────────────────────────────────────────── */

// Tennis-court line diagram (lifted from brand-hero.html)
// Drawn proportional to artboard via percentages so it scales nicely.
const CourtLines = ({ opacity = 0.14, color = "#ffffff", strokeScale = 1 }) => {
  const stroke = 2 * strokeScale;
  const s = { position: "absolute", inset: 0, opacity, pointerEvents: "none" };
  // doubles court: 78x36 ratio (real); we use a centered rectangle ~70% wide
  return (
    <div style={s}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        {/* doubles court */}
        <rect x="15" y="20" width="70" height="60" fill="none" stroke={color} strokeWidth={stroke * 0.25} />
        {/* singles sidelines */}
        <line x1="22" y1="20" x2="22" y2="80" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="78" y1="20" x2="78" y2="80" stroke={color} strokeWidth={stroke * 0.25} />
        {/* net */}
        <line x1="15" y1="50" x2="85" y2="50" stroke={color} strokeWidth={stroke * 0.35} />
        {/* service lines */}
        <line x1="22" y1="35" x2="78" y2="35" stroke={color} strokeWidth={stroke * 0.25} />
        <line x1="22" y1="65" x2="78" y2="65" stroke={color} strokeWidth={stroke * 0.25} />
        {/* center service line */}
        <line x1="50" y1="35" x2="50" y2="65" stroke={color} strokeWidth={stroke * 0.25} />
      </svg>
    </div>
  );
};

const Wappen = ({ size = 88, style }) => (
  <img
    src="assets/wappen.png"
    alt="TC BW Attendorn Wappen"
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      ...style,
    }}
  />
);

// Brand mark text-block (used in footers of templates)
const BrandMark = ({ tone = "light", scale = 1 }) => {
  const isDark = tone === "dark";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
      <Wappen size={44 * scale} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16 * scale,
            color: isDark ? "#fff" : "var(--blue-700)",
            letterSpacing: "-0.01em",
          }}
        >
          TC Blau-Weiss Attendorn
        </span>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: 11 * scale,
            color: isDark ? "var(--blue-200)" : "var(--gray-500)",
            letterSpacing: "0.04em",
            marginTop: 2 * scale,
          }}
        >
          @tcbwattendorn · Seit 1931
        </span>
      </div>
    </div>
  );
};

// Eyebrow label
const Eyebrow = ({ children, color, scale = 1, style }) => (
  <div
    style={{
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      fontSize: 13 * scale,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ─────────────────────────────────────────────
   ACCENT COLOR HELPER
   ───────────────────────────────────────────── */

const ACCENTS = {
  win:  { primary: "#1e56a0", deep: "#0f2240", soft: "#dceafb", tag: "Heimsieg" },
  loss: { primary: "#4b5563", deep: "#1f2937", soft: "#e2e5ea", tag: "Heimspiel" },
  pokal:{ primary: "#f97316", deep: "#9a2e0a", soft: "#fff7ed", tag: "Pokal" },
};

/* ─────────────────────────────────────────────
   TEMPLATE 1 — MATCH RESULT
   ───────────────────────────────────────────── */

/**
 * MatchResult — one component, two formats (square / story), three variants.
 * @param format "square" (1080x1080) | "story" (1080x1920)
 * @param variant "win" | "loss" | "pokal"
 */
const MatchResult = ({ format = "square", variant = "win", data }) => {
  const isStory = format === "story";
  const W = 1080;
  const H = isStory ? 1920 : 1080;
  const a = ACCENTS[variant];
  const isLoss = variant === "loss";

  // Default sample data
  const d = {
    team: "Herren 30",
    home: 6,
    away: 3,
    opponent: "Olper TC",
    date: "04.07.2026",
    location: "Heimspiel",
    league: "Kreisliga",
    ...data,
  };

  // Background depends on variant:
  // win  -> hero gradient (deep navy) with court lines
  // loss -> light neutral, contained
  // pokal-> hero gradient with orange tint via overlay
  const bg = isLoss
    ? "var(--gray-50)"
    : variant === "pokal"
    ? "linear-gradient(160deg, #1a1530 0%, #2a1810 50%, #3d1908 100%)"
    : "linear-gradient(160deg, var(--blue-700) 0%, var(--blue-800) 40%, var(--blue-900) 100%)";

  const onDark = !isLoss;
  const fg = onDark ? "#fff" : "var(--gray-800)";
  const fgMuted = onDark ? "var(--blue-200)" : "var(--gray-500)";
  const fgQuiet = onDark ? "rgba(255,255,255,0.55)" : "var(--gray-400)";

  // Layout pads scale with format
  const pad = isStory ? 80 : 64;

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        background: bg,
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
        color: fg,
      }}
    >
      {/* Decorative court lines on dark variants */}
      {onDark && (
        <CourtLines
          opacity={variant === "pokal" ? 0.10 : 0.13}
          color="#ffffff"
          strokeScale={3}
        />
      )}

      {/* Soft radial highlight */}
      {onDark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: variant === "pokal"
              ? "radial-gradient(circle at 80% 0%, rgba(249,115,22,0.25), transparent 55%), radial-gradient(circle at 0% 100%, rgba(249,115,22,0.12), transparent 60%)"
              : "radial-gradient(circle at 80% 0%, rgba(106,163,235,0.22), transparent 55%), radial-gradient(circle at 0% 100%, rgba(58,123,213,0.14), transparent 60%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* TOP ROW — team name (left) + wappen (right) */}
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          right: pad,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Eyebrow scale={1.4} color={a.primary === "#4b5563" ? "var(--gray-500)" : a.primary === "#1e56a0" ? "var(--blue-300)" : "#fb923c"}>
            {variant === "pokal" ? "WTV Vereinspokal" : a.tag}
          </Eyebrow>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: isStory ? 92 : 76,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              color: fg,
            }}
          >
            {d.team}
          </div>
        </div>
        <Wappen size={isStory ? 130 : 110} style={{ flexShrink: 0 }} />
      </div>

      {/* CENTER — score */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          transform: "translateY(-50%)",
          textAlign: "center",
          padding: `0 ${pad}px`,
        }}
      >
        {/* small label above score */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: isStory ? 22 : 19,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: fgQuiet,
            marginBottom: isStory ? 36 : 28,
          }}
        >
          Endstand
        </div>

        {/* Score */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: isStory ? 380 : 300,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            color: fg,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: isStory ? 50 : 36,
          }}
        >
          <span style={{ minWidth: isStory ? 200 : 160, textAlign: "right" }}>{d.home}</span>
          <span
            style={{
              color: a.primary,
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: isStory ? 320 : 250,
              lineHeight: 1,
              transform: "translateY(-8px)",
            }}
          >
            :
          </span>
          <span
            style={{
              minWidth: isStory ? 200 : 160,
              textAlign: "left",
              color: isLoss ? "var(--gray-500)" : fg,
              opacity: isLoss ? 0.7 : 1,
            }}
          >
            {d.away}
          </span>
        </div>

        {/* vs. opponent */}
        <div
          style={{
            marginTop: isStory ? 40 : 30,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontStyle: "italic",
            fontSize: isStory ? 56 : 46,
            color: fg,
            letterSpacing: "-0.01em",
          }}
        >
          vs. {d.opponent}
        </div>

        {/* date */}
        <div
          style={{
            marginTop: isStory ? 22 : 16,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: isStory ? 30 : 26,
            color: fgMuted,
            letterSpacing: "0.02em",
          }}
        >
          {d.date} · {d.location}
        </div>
      </div>

      {/* BOTTOM — League badge (right) + brand (left) */}
      <div
        style={{
          position: "absolute",
          bottom: pad,
          left: pad,
          right: pad,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        <BrandMark tone={onDark ? "dark" : "light"} scale={isStory ? 1.6 : 1.4} />

        {/* League pill */}
        <div
          style={{
            background: variant === "pokal"
              ? a.primary
              : isLoss
              ? "var(--white)"
              : "rgba(255,255,255,0.96)",
            color: variant === "pokal" ? "#fff" : "var(--blue-700)",
            padding: isStory ? "14px 28px" : "12px 22px",
            borderRadius: 999,
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: isStory ? 22 : 18,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: onDark ? "0 4px 16px rgba(0,0,0,0.3)" : "var(--shadow-md)",
            border: isLoss ? "1px solid var(--gray-200)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          {variant === "pokal" ? "WTV Vereinspokal" : d.league}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   TEMPLATE 2 — MATCH ANNOUNCEMENT
   ───────────────────────────────────────────── */

/**
 * MatchAnnouncement — one component, three formats, two variants.
 * @param format "square" (1080x1080) | "portrait" (1080x1350) | "story" (1080x1920)
 * @param variant "league" | "pokal"
 */
const MatchAnnouncement = ({ format = "portrait", variant = "league", data }) => {
  const W = 1080;
  const H = format === "square" ? 1080 : format === "portrait" ? 1350 : 1920;
  const isStory = format === "story";
  const isSquare = format === "square";

  const d = {
    team: "Herren 40",
    opponent: "TC Iserlohn",
    dateLine1: "30. Mai",
    dateLine2: "13:00 Uhr",
    league: "Südwestfalenliga",
    location: "Tennisanlage Burg Schnellenberg",
    cta: "Komm vorbei",
    eyebrow: variant === "pokal" ? "Pokal-Heimspiel" : "Nächstes Heimspiel",
    ...data,
  };

  const accent = variant === "pokal" ? "#f97316" : "#1e56a0";
  const accentDeep = variant === "pokal" ? "#9a2e0a" : "#0f2240";

  // Court image (used as bg, with dark overlay)
  const bgImage = "assets/foto-anlage-2.jpg";

  // Vertical pad
  const pad = isStory ? 84 : isSquare ? 60 : 70;

  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        overflow: "hidden",
        fontFamily: "var(--font-sans)",
        color: "#fff",
        background: "#0a1628",
      }}
    >
      {/* Background photo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.85)",
        }}
      />
      {/* Color wash + dark overlay for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: variant === "pokal"
            ? "linear-gradient(180deg, rgba(20, 8, 0, 0.62) 0%, rgba(154, 46, 10, 0.55) 50%, rgba(10, 5, 0, 0.85) 100%)"
            : "linear-gradient(180deg, rgba(10, 22, 40, 0.55) 0%, rgba(15, 34, 64, 0.7) 50%, rgba(10, 22, 40, 0.92) 100%)",
        }}
      />
      {/* Court line decoration in upper third */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", opacity: 0.12 }}>
        <CourtLines color="#ffffff" strokeScale={3} opacity={1} />
      </div>

      {/* TOP ROW */}
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          right: pad,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          zIndex: 2,
        }}
      >
        <Eyebrow
          scale={1.6}
          color={variant === "pokal" ? "#fb923c" : "var(--blue-200)"}
        >
          {d.eyebrow}
        </Eyebrow>
        <Wappen size={isStory ? 130 : 110} />
      </div>

      {/* MAIN CONTENT — vertically centered block */}
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: isStory ? 40 : 28,
          zIndex: 2,
        }}
      >
        {/* Team */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: isStory ? 56 : isSquare ? 44 : 52,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          {d.team}
        </div>

        {/* "vs. opponent" — display serif, large */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: isStory ? 132 : isSquare ? 92 : 116,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            color: "#fff",
          }}
        >
          <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.6)", marginRight: 18 }}>
            vs.
          </span>
          {d.opponent}
        </div>

        {/* Accent bar */}
        <div
          style={{
            width: isStory ? 130 : 100,
            height: 6,
            background: accent,
            marginTop: isStory ? 16 : 8,
            marginBottom: isStory ? 16 : 8,
            borderRadius: 3,
          }}
        />

        {/* Date — biggest emphasis */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: isStory ? 24 : 18,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: isStory ? 168 : isSquare ? 116 : 144,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#fff",
            }}
          >
            {d.dateLine1}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: isStory ? 64 : isSquare ? 48 : 60,
            color: variant === "pokal" ? "#fdba74" : "#93c5fd",
            letterSpacing: "0.01em",
            lineHeight: 1,
            marginTop: isStory ? -16 : -8,
            textShadow: "0 2px 12px rgba(0,0,0,0.45)",
          }}
        >
          {d.dateLine2}
        </div>

        {/* League */}
        <div
          style={{
            marginTop: isStory ? 14 : 6,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: isStory ? 30 : isSquare ? 24 : 28,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.03em",
          }}
        >
          {variant === "pokal" ? "WTV Vereinspokal" : d.league}
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div
        style={{
          position: "absolute",
          bottom: pad,
          left: pad,
          right: pad,
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: isStory ? 10 : 6, maxWidth: "75%" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontStyle: "italic",
                fontSize: isStory ? 44 : isSquare ? 32 : 40,
                color: "#fff",
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
              }}
            >
              {d.cta} —
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                fontSize: isStory ? 26 : isSquare ? 19 : 24,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.3,
              }}
            >
              {d.location}
            </div>
          </div>

          <BrandMark tone="dark" scale={isStory ? 1.4 : 1.15} />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   EXPORT
   ───────────────────────────────────────────── */

Object.assign(window, {
  MatchResult,
  MatchAnnouncement,
  Wappen,
  BrandMark,
  CourtLines,
  Eyebrow,
});
