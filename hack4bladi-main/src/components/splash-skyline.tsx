/**
 * The splash artwork, all SVG in the brand reds.
 *
 * - `SplashSky`: a crescent, a few eight-point (zellige) stars that twinkle, set in the
 *   free space beside the brand block.
 * - `SplashSkyline`: distant mountains, then kasbah walls and domes, a city gate with a
 *   horseshoe arch, houses, then the minaret, palms and a cypress in front. Windows are
 *   cut in the stage red so every layer reads on the red background.
 */
const BACK = "#C65323";
const MID = "#8A1712";
const FRONT = "#650B0D";
const STAGE = "#A8060F";
const STAR = "M8 0l2.2 3.4L14 2l-1.4 3.8L16 8l-3.4 2.2L14 14l-3.8-1.4L8 16l-2.2-3.4L2 14l1.4-3.8L0 8l3.4-2.2L2 2l3.8 1.4z";

/** An arched window or door, bottom-centre anchored. */
function Arch({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const r = w / 2;
  return <path d={`M${x - r} ${y}v-${h - r}a${r} ${r} 0 0 1 ${w} 0v${h - r}Z`} />;
}

function Palm({ x, y, scale = 1, color }: { x: number; y: number; scale?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color} stroke={color}>
      <path d="M0 0C2-30-5-62 4-100" fill="none" strokeWidth={5} strokeLinecap="round" />
      <g transform="translate(4 -100)" stroke="none">
        {[-168, -140, -112, -80, -50, -22, 8, 22].map((angle) => (
          <path key={angle} transform={`rotate(${angle})`} d="M0 0C10-12 30-15 46-5C30-7 14-2 0 0Z" />
        ))}
        <circle r={4} />
        <circle cx={-3} cy={5} r={2.4} />
        <circle cx={3} cy={6} r={2.4} />
      </g>
    </g>
  );
}

const SKY_STARS: { left: string; top: string; size: number; delay: number }[] = [
  { left: "9%", top: "13%", size: 12, delay: 0 },
  { left: "19%", top: "27%", size: 7, delay: 900 },
  { left: "7%", top: "40%", size: 9, delay: 1700 },
  { left: "86%", top: "25%", size: 9, delay: 500 },
  { left: "91%", top: "39%", size: 6, delay: 1300 },
  { left: "78%", top: "47%", size: 8, delay: 2100 },
];

export function SplashSky() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg viewBox="-16 -16 32 32" className="text-cream absolute top-[9%] right-[11%] size-[clamp(2rem,9vw,2.75rem)] opacity-90">
        <path d="M0-15A15 15 0 0 0 0 15A20 20 0 0 1 0-15Z" fill="currentColor" transform="translate(6 0) rotate(-20)" />
      </svg>
      {SKY_STARS.map((star) => (
        <svg
          key={`${star.left}-${star.top}`}
          viewBox="0 0 16 16"
          className="text-cream splash-twinkle absolute fill-current"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: `${star.delay}ms` }}
        >
          <path d={STAR} />
        </svg>
      ))}
    </div>
  );
}

export function SplashSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" aria-hidden className={className}>
      {/* Far: the Atlas, barely there. */}
      <path d="M0 300V196L38 178L76 192L118 164L168 188L214 156L262 182L304 162L346 184L390 170V300Z" fill="#7A0510" opacity={0.35} />

      {/* Back: walls, a domed house, a small minaret, more domes on the right. */}
      <g fill={BACK}>
        <rect x={0} y={222} width={64} height={78} />
        {[4, 16, 28, 40, 52].map((x) => (
          <rect key={x} x={x} y={215} width={6} height={8} />
        ))}
        <rect x={62} y={200} width={54} height={100} />
        <path d="M62 201Q89 152 116 201Z" />
        <rect x={88} y={146} width={2} height={10} />
        <circle cx={89} cy={145} r={2.4} />
        <rect x={128} y={152} width={16} height={148} />
        {[128, 133.5, 139].map((x) => (
          <rect key={x} x={x} y={146} width={5} height={7} />
        ))}
        <rect x={132} y={134} width={8} height={14} />
        <path d="M132 135Q136 126 140 135Z" />
        <rect x={144} y={214} width={52} height={86} />
        <rect x={290} y={206} width={58} height={94} />
        <path d="M290 207Q319 172 348 207Z" />
        <rect x={318} y={168} width={2} height={8} />
        <rect x={348} y={220} width={42} height={80} />
        {[352, 364, 376].map((x) => (
          <rect key={x} x={x} y={213} width={6} height={8} />
        ))}
      </g>
      <g fill={STAGE} opacity={0.5}>
        <Arch x={80} y={232} w={10} h={16} />
        <Arch x={100} y={232} w={10} h={16} />
        <Arch x={136} y={176} w={5} h={9} />
        <Arch x={170} y={238} w={12} h={16} />
        <Arch x={308} y={234} w={10} h={14} />
        <Arch x={330} y={234} w={10} h={14} />
      </g>

      {/* Middle: the city gate (bab) with its horseshoe arch, houses, a palm. */}
      <Palm x={198} y={266} scale={0.85} color={MID} />
      <g fill={MID}>
        <rect x={0} y={248} width={72} height={52} />
        <rect x={68} y={228} width={86} height={72} />
        {[68, 79, 90, 101, 112, 123, 134, 145].map((x) => (
          <rect key={x} x={x} y={220} width={6} height={9} />
        ))}
        <rect x={160} y={244} width={66} height={56} />
        <rect x={276} y={244} width={114} height={56} />
        <rect x={298} y={230} width={42} height={70} />
      </g>
      <path d="M93 300V262A19 19 0 1 1 129 262V300Z" fill={BACK} opacity={0.55} />
      <g fill={STAGE}>
        <path d="M98 300V263A15 15 0 1 1 124 263V300Z" />
        <rect x={68} y={238} width={86} height={2} opacity={0.6} />
      </g>
      <g fill={STAGE} opacity={0.6}>
        <Arch x={22} y={270} w={12} h={16} />
        <Arch x={180} y={266} w={10} h={14} />
        <Arch x={208} y={266} w={10} h={14} />
        <Arch x={319} y={262} w={14} h={20} />
        <Arch x={364} y={270} w={10} h={14} />
      </g>

      {/* Front: the minaret with its sebka lozenges, palms, a cypress, birds, the ground. */}
      <g fill={FRONT}>
        <rect x={232} y={94} width={34} height={206} />
        {[232, 241.5, 251, 260.5].map((x) => (
          <rect key={x} x={x} y={85} width={5} height={10} />
        ))}
        <rect x={241} y={62} width={16} height={32} />
        {[241, 247.5, 254].map((x) => (
          <rect key={x} x={x} y={57} width={3} height={6} />
        ))}
        <path d="M241 58Q249 42 257 58Z" />
        <rect x={248.3} y={30} width={1.4} height={16} />
        <circle cx={249} cy={36} r={2.6} />
        <circle cx={249} cy={42} r={1.9} />
      </g>
      <g fill={STAGE}>
        <rect x={232} y={104} width={34} height={3} opacity={0.7} />
        {[0, 1, 2].map((col) =>
          [0, 1].map((row) => (
            <path
              key={`${col}-${row}`}
              d={`M${240 + col * 9} ${118 + row * 12}l4.5-5 4.5 5-4.5 5Z`}
              opacity={0.55}
            />
          )),
        )}
        <Arch x={249} y={176} w={9} h={16} />
        <Arch x={249} y={224} w={9} h={16} />
        <rect x={245} y={70} width={8} height={12} rx={4} />
      </g>
      <path d="M296 282C287 254 291 228 296 214C301 228 305 254 296 282Z" fill={FRONT} />
      <Palm x={48} y={278} scale={1.12} color={FRONT} />
      <Palm x={150} y={284} scale={0.62} color={FRONT} />
      <Palm x={348} y={280} scale={0.96} color={FRONT} />
      <g fill="none" stroke={FRONT} strokeWidth={1.6} strokeLinecap="round">
        <path d="M186 96q4-4 8 0q4-4 8 0" />
        <path d="M206 82q3-3 6 0q3-3 6 0" />
        <path d="M282 110q3.5-3.5 7 0q3.5-3.5 7 0" />
      </g>
      <path d="M0 300V274Q60 264 122 272T246 269T390 267V300Z" fill={FRONT} />
    </svg>
  );
}
