import { motion } from "framer-motion";

const NETWORK_NODES: { cx: number; cy: number }[] = [
  { cx: 120, cy: 180 },
  { cx: 280, cy: 120 },
  { cx: 420, cy: 200 },
  { cx: 560, cy: 90 },
  { cx: 700, cy: 160 },
  { cx: 840, cy: 110 },
  { cx: 200, cy: 320 },
  { cx: 480, cy: 280 },
  { cx: 720, cy: 340 },
  { cx: 360, cy: 380 },
];

const NETWORK_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
  [2, 6],
  [2, 7],
  [4, 7],
  [4, 8],
  [6, 9],
  [7, 9],
  [7, 8],
  [1, 3],
];

export function LoginBackground() {
  return (
    <motion.div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Gradiente base — azul profundo → royal */}
      <div className="absolute inset-0 login-page-bg" />

      {/* Orbes de luz */}
      <motion.div
        className="absolute -left-24 top-[12%] h-[28rem] w-[28rem] rounded-full bg-cyan/25 blur-[110px]"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 top-[5%] h-[32rem] w-[32rem] rounded-full bg-azure/30 blur-[120px]"
        animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.05, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <div className="absolute bottom-[22%] left-1/2 h-48 w-[min(90%,56rem)] -translate-x-1/2 rounded-full bg-cyan/15 blur-[90px]" />

      {/* Horizonte luminoso */}
      <motion.div className="absolute inset-x-0 bottom-[26%] h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-[24%] h-24 bg-gradient-to-t from-cyan/10 via-transparent to-transparent" />

      {/* Skyline — silhueta urbana */}
      <svg
        className="absolute bottom-0 left-1/2 w-[min(120%,64rem)] max-w-none -translate-x-1/2 opacity-[0.22] sm:opacity-[0.28]"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMax meet"
        fill="none"
      >
        <defs>
          <linearGradient id="loginCityFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--cyan))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--cyan))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#loginCityFade)"
          d="M0 320 V260 H40 V200 H70 V320 H100 V180 H130 V140 H160 V320 H190 V220 H220 V320 H250 V160 H280 V120 H310 V90 H340 V320 H370 V200 H400 V150 H430 V320 H460 V240 H490 V320 H520 V170 H550 V130 H580 V100 H610 V75 H640 V320 H670 V210 H700 V320 H730 V190 H760 V150 H790 V320 H820 V230 H850 V320 H880 V175 H910 V135 H940 V105 H970 V85 H1000 V320 H1030 V200 H1060 V320 H1090 V250 H1120 V320 H1200 V320 Z"
        />
      </svg>

      {/* Rede de conexões — tela inteira */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35] sm:opacity-[0.45]"
        viewBox="0 0 960 540"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="loginLineGlow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--cyan))" stopOpacity="0.15" />
            <stop offset="50%" stopColor="hsl(var(--cyan))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--azure))" stopOpacity="0.4" />
          </linearGradient>
          <filter id="loginNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Trilhas de dados */}
        <path
          d="M0 420 C180 360 320 400 480 340 S780 280 960 220"
          stroke="url(#loginLineGlow)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 14"
          opacity="0.7"
        />
        <path
          d="M0 480 L960 300"
          stroke="hsl(var(--cyan))"
          strokeWidth="1"
          fill="none"
          opacity="0.25"
        />
        {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800].map((x) => (
          <line
            key={x}
            x1={x}
            y1={540}
            x2={x + 60}
            y2={280}
            stroke="hsl(var(--cyan))"
            strokeWidth="0.75"
            opacity="0.2"
          />
        ))}

        {NETWORK_EDGES.map(([a, b], i) => (
          <line
            key={`edge-${i}`}
            x1={NETWORK_NODES[a].cx}
            y1={NETWORK_NODES[a].cy}
            x2={NETWORK_NODES[b].cx}
            y2={NETWORK_NODES[b].cy}
            stroke="url(#loginLineGlow)"
            strokeWidth="1"
            opacity="0.55"
          />
        ))}

        {NETWORK_NODES.map((node, i) => (
          <g key={i} filter="url(#loginNodeGlow)">
            <circle cx={node.cx} cy={node.cy} r="5" fill="hsl(var(--cyan))" opacity="0.35" />
            <circle cx={node.cx} cy={node.cy} r="2.5" fill="hsl(var(--cyan))" />
          </g>
        ))}
      </svg>

      {/* Vinheta nas bordas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_45%,transparent_30%,hsl(220_80%_6%/0.75)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_85%_5%/0.5)] via-transparent to-[hsl(var(--navy)/0.85)]" />
    </motion.div>
  );
}
