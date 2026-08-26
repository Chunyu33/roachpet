import type { Roach } from "../types/roach";

interface RoachSpriteProps {
  roach: Roach;
  pointerAngle?: number | null;
}

type Leg = {
  key: string;
  side: -1 | 1;
  anchor: [number, number];
  knee: [number, number];
  foot: [number, number];
  phase: number;
};

// Each leg leaves the body, bends at a knee, then reaches outward and slightly
// forward/backward, which reads much closer to a real cockroach than radial rays.
const legs: Leg[] = [
  {
    key: "front-left",
    side: -1,
    anchor: [40, 40],
    knee: [27, 33],
    foot: [14, 25],
    phase: 0,
  },
  {
    key: "middle-left",
    side: -1,
    anchor: [37, 51],
    knee: [22, 49],
    foot: [8, 54],
    phase: Math.PI,
  },
  {
    key: "rear-left",
    side: -1,
    anchor: [38, 63],
    knee: [25, 70],
    foot: [14, 82],
    phase: 0,
  },
  {
    key: "front-right",
    side: 1,
    anchor: [56, 40],
    knee: [69, 33],
    foot: [82, 25],
    phase: Math.PI,
  },
  {
    key: "middle-right",
    side: 1,
    anchor: [59, 51],
    knee: [74, 49],
    foot: [88, 54],
    phase: 0,
  },
  {
    key: "rear-right",
    side: 1,
    anchor: [58, 63],
    knee: [71, 70],
    foot: [82, 82],
    phase: Math.PI,
  },
];

export function RoachSprite({ roach, pointerAngle = null }: RoachSpriteProps) {
  const gradientId = roach.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const running = roach.state === "RUN" || roach.state === "FLEE";
  const motion = Math.min(1, roach.speed / Math.max(roach.targetSpeed, 1));
  const gaitRate = running ? 1.35 : 1;
  const bob = Math.sin(roach.gaitPhase * 2) * (running ? 1.1 : 0.65) * motion;
  const headBias =
    pointerAngle == null
      ? Math.sin(roach.animationTime * 1.7) * 3
      : pointerAngle * 0.07;
  const antennaLeft =
    Math.sin(roach.animationTime * 3.8) * 5 + (pointerAngle ?? 0) * 0.1;
  const antennaRight =
    Math.sin(roach.animationTime * 3.35 + 1.9) * 5 + (pointerAngle ?? 0) * 0.08;
  const legAmplitude = running ? 5 : 3.2;

  return (
    <svg className="roach-svg" viewBox="0 0 96 108" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${gradientId}-abdomen`}
          x1="0"
          x2="1"
          y1="0"
          y2="1"
        >
          <stop offset="0" stopColor="#2a110b" />
          <stop offset="0.42" stopColor="#6e2e18" />
          <stop offset="1" stopColor="#260d08" />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-pronotum`}
          x1="0"
          x2="1"
          y1="0"
          y2="1"
        >
          <stop offset="0" stopColor="#a45b2c" />
          <stop offset="0.5" stopColor="#5a2413" />
          <stop offset="1" stopColor="#2a100a" />
        </linearGradient>
      </defs>

      <g
        transform={`translate(0 ${bob})`}
        stroke="#241009"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {legs.map((leg) => {
          const step = Math.sin(roach.gaitPhase * gaitRate + leg.phase);
          const lift = Math.max(0, step) * legAmplitude * motion;
          const swing = step * (running ? 2.8 : 1.6) * motion;
          // The table already contains the final left/right coordinates.
          // Mirroring these values again would collapse every right leg onto
          // the left side of the body.
          const ax = leg.anchor[0];
          const ay = leg.anchor[1];
          const kx = leg.knee[0] + leg.side * swing;
          const ky = leg.knee[1] - lift;
          const fx = leg.foot[0] + leg.side * swing * 1.3;
          const fy = leg.foot[1] - lift * 0.35;
          return (
            <g key={leg.key} fill="none" strokeWidth="1.8">
              <path d={`M${ax} ${ay} L${kx} ${ky} L${fx} ${fy}`} />
              <circle cx={kx} cy={ky} r="1" fill="#9b5430" stroke="none" />
            </g>
          );
        })}

        <g
          transform={`rotate(${antennaLeft} 43 30)`}
          fill="none"
          strokeWidth="1.1"
        >
          <path d="M43 30 C35 19 24 8 5 0" />
          <circle cx="5" cy="0" r="1" fill="#c98250" stroke="none" />
        </g>
        <g
          transform={`rotate(${antennaRight} 53 30)`}
          fill="none"
          strokeWidth="1.1"
        >
          <path d="M53 30 C61 19 72 8 91 0" />
          <circle cx="91" cy="0" r="1" fill="#c98250" stroke="none" />
        </g>

        <path
          d="M39 43 C34 55 35 77 48 96 C61 77 62 55 57 43 C54 39 42 39 39 43 Z"
          fill={`url(#${gradientId}-abdomen)`}
          strokeWidth="2"
        />
        <path
          d="M48 44 C45 58 45 78 48 94 C51 78 51 58 48 44Z"
          fill="#a8542d"
          opacity=".5"
          stroke="none"
        />
        <path
          d="M48 45 V94 M40 56 Q48 61 56 56 M38 68 Q48 74 58 68 M39 80 Q48 86 57 80"
          fill="none"
          stroke="#c87842"
          strokeOpacity=".48"
          strokeWidth="1"
        />

        <g transform={`rotate(${headBias + (running ? 3 : 0)} 48 36)`}>
          <path
            d="M39 32 Q48 25 57 32 L59 43 Q48 50 37 43Z"
            fill={`url(#${gradientId}-pronotum)`}
            strokeWidth="2"
          />
          <ellipse
            cx="48"
            cy="28"
            rx="5.5"
            ry="6.5"
            fill="#32120b"
            strokeWidth="1.5"
          />
          <circle cx="45.8" cy="27" r=".9" fill="#d58a52" stroke="none" />
          <circle cx="50.2" cy="27" r=".9" fill="#d58a52" stroke="none" />
        </g>
      </g>
    </svg>
  );
}
