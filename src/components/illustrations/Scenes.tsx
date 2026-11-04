/**
 * Ilustrações próprias do CENA LAB, feitas em SVG + CSS.
 * São decorativas e representam a estética dos estilos — NÃO são vídeos
 * gerados pelo produto. Sempre exibidas com o rótulo "Ilustração".
 */

function Skyline({ fill, y, seed }: { fill: string; y: number; seed: number }) {
  // 10 blocos em faixas de 40px = período exato de 400px (loop sem emenda).
  const shapes = Array.from({ length: 10 }, (_, i) => {
    const w = 28 + ((i * 37 + seed) % 10);
    const h = 40 + ((i * 53 + seed * 7) % 90);
    return <rect key={i} x={i * 40} y={y - h} width={w} height={h + 200} rx={2} fill={fill} />;
  });
  return <g>{shapes}</g>;
}

/** Stickman Stories: o último homem caminhando por uma cidade vazia. */
export function StickmanScene({ className = "", uid = "a" }: { className?: string; uid?: string }) {
  const sky = `sm-sky-${uid}`;
  const lamp = `sm-lamp-${uid}`;
  return (
    <svg viewBox="0 0 270 480" className={className} role="img" aria-label="Ilustração no estilo Stickman: um boneco de palito caminhando por uma cidade vazia à noite">
      <defs>
        <linearGradient id={sky} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0E1726" />
          <stop offset="1" stopColor="#1F3147" />
        </linearGradient>
        <radialGradient id={lamp} cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#E8B04B" stopOpacity="0.55" />
          <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="270" height="480" fill={`url(#${sky})`} />
      <circle cx="205" cy="92" r="26" fill="#F2F4F7" opacity="0.9" />
      <circle cx="214" cy="86" r="24" fill="#0E1726" opacity="0.9" />
      {[[30, 60], [80, 40], [140, 110], [240, 160], [60, 150], [180, 30]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#F2F4F7" opacity="0.7" />
      ))}

      <g className="anim-drift-slow">
        <Skyline fill="#1a2a3f" y={300} seed={3} />
        <g transform="translate(400 0)">
          <Skyline fill="#1a2a3f" y={300} seed={3} />
        </g>
      </g>
      <g className="anim-drift">
        <Skyline fill="#24384f" y={340} seed={11} />
        <g transform="translate(400 0)">
          <Skyline fill="#24384f" y={340} seed={11} />
        </g>
      </g>

      <rect y="378" width="270" height="102" fill="#101b2b" />
      <line x1="0" y1="378" x2="270" y2="378" stroke="#F2F4F7" strokeOpacity="0.25" strokeWidth="2" />

      {/* Poste com luz piscando (cor de destaque) */}
      <g className="anim-flicker">
        <path d="M58 270 L20 378 L96 378 Z" fill={`url(#${lamp})`} />
        <circle cx="58" cy="268" r="5" fill="#E8B04B" />
      </g>
      <line x1="58" y1="268" x2="58" y2="378" stroke="#F2F4F7" strokeWidth="3" strokeLinecap="round" />

      {/* Boneco caminhando */}
      <ellipse cx="150" cy="380" rx="20" ry="4" fill="#000" opacity="0.3" />
      <g className="anim-bob" stroke="#F2F4F7" strokeWidth="5" strokeLinecap="round" fill="none">
        <circle cx="150" cy="292" r="12" />
        <line x1="150" y1="304" x2="150" y2="340" />
        <line className="anim-leg-a" x1="150" y1="340" x2="150" y2="376" />
        <line className="anim-leg-b" x1="150" y1="340" x2="150" y2="376" />
        <line className="anim-leg-b" x1="150" y1="310" x2="150" y2="336" />
        <line className="anim-leg-a" x1="150" y1="310" x2="150" y2="336" />
        <path d="M141 306 q9 6 18 0" stroke="#E8B04B" strokeWidth="5" />
      </g>

      <text x="135" y="438" textAnchor="middle" fill="#F2F4F7" fontSize="15" fontWeight="800" fontFamily="system-ui, sans-serif">
        Ninguém respondeu.
      </text>
    </svg>
  );
}

/** Cartoon 2D: astronauta flutuando diante de uma porta no espaço. */
export function CartoonScene({ className = "", uid = "a" }: { className?: string; uid?: string }) {
  const sky = `ct-sky-${uid}`;
  const glow = `ct-glow-${uid}`;
  return (
    <svg viewBox="0 0 270 480" className={className} role="img" aria-label="Ilustração no estilo Cartoon 2D: um astronauta flutuando diante de uma porta iluminada no espaço">
      <defs>
        <linearGradient id={sky} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#070B1A" />
          <stop offset="1" stopColor="#14234A" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5CF2E3" stopOpacity="0.5" />
          <stop offset="1" stopColor="#5CF2E3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="270" height="480" fill={`url(#${sky})`} />
      {Array.from({ length: 34 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 47) % 270}
          cy={(i * 89) % 480}
          r={i % 3 === 0 ? 1.6 : 1}
          fill="#EAF2FF"
          opacity={0.4 + (i % 4) * 0.15}
          className={i % 5 === 0 ? "anim-flicker" : undefined}
        />
      ))}
      <circle cx="40" cy="420" r="70" fill="#3E6FD8" opacity="0.35" />
      <circle cx="58" cy="402" r="12" fill="#14234A" opacity="0.4" />

      {/* Porta */}
      <circle cx="190" cy="190" r="90" fill={`url(#${glow})`} />
      <rect x="160" y="130" width="60" height="110" rx="6" fill="#14234A" stroke="#EAF2FF" strokeWidth="4" />
      <rect x="166" y="136" width="20" height="98" fill="#5CF2E3" className="anim-flicker" />
      <circle cx="208" cy="188" r="3.5" fill="#EAF2FF" />

      {/* Astronauta */}
      <g className="anim-float">
        <ellipse cx="96" cy="296" rx="26" ry="32" fill="#EAF2FF" stroke="#0b1430" strokeWidth="4" />
        <rect x="70" y="282" width="12" height="34" rx="6" fill="#8fa5d8" stroke="#0b1430" strokeWidth="4" />
        <path d="M118 285 q22 -14 34 -34" stroke="#EAF2FF" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M118 285 q22 -14 34 -34" stroke="#0b1430" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25" />
        <rect x="80" y="320" width="13" height="30" rx="6" fill="#EAF2FF" stroke="#0b1430" strokeWidth="4" />
        <rect x="100" y="320" width="13" height="30" rx="6" fill="#EAF2FF" stroke="#0b1430" strokeWidth="4" />
        <circle cx="96" cy="246" r="30" fill="#EAF2FF" stroke="#0b1430" strokeWidth="4" />
        <rect x="76" y="232" width="42" height="28" rx="14" fill="#0b1430" />
        <g className="anim-blink">
          <ellipse cx="91" cy="246" rx="4" ry="5.5" fill="#5CF2E3" />
          <ellipse cx="106" cy="246" rx="4" ry="5.5" fill="#5CF2E3" />
        </g>
        <path d="M84 236 q6 -4 12 0" stroke="#5CF2E3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      <text x="135" y="438" textAnchor="middle" fill="#EAF2FF" fontSize="15" fontWeight="800" fontFamily="system-ui, sans-serif">
        A porta estava <tspan fill="#5CF2E3">aberta</tspan>.
      </text>
    </svg>
  );
}

/**
 * Cena de marca (paleta clara): personagem diante de uma escolha A/B.
 * Ilustração própria, exibida sempre com rótulo — não é um vídeo gerado.
 */
export function StoryScene({ className = "", uid = "a" }: { className?: string; uid?: string }) {
  const sky = `st-sky-${uid}`;
  return (
    <svg viewBox="0 0 270 480" className={className} role="img" aria-label="Ilustração: personagem de desenho diante de duas placas, A e B, escolhendo um caminho">
      <defs>
        <linearGradient id={sky} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E3EAFF" />
          <stop offset="1" stopColor="#FDEEF5" />
        </linearGradient>
      </defs>
      <rect width="270" height="480" fill={`url(#${sky})`} />
      <circle cx="200" cy="96" r="34" fill="#F5A7CA" />
      <g className="anim-drift-slow" fill="#FFFFFF" opacity="0.9">
        {[0, 400].map((o) => (
          <g key={o} transform={`translate(${o} 0)`}>
            <ellipse cx="60" cy="70" rx="34" ry="12" />
            <ellipse cx="260" cy="130" rx="40" ry="13" />
            <ellipse cx="160" cy="40" rx="26" ry="9" />
          </g>
        ))}
      </g>
      <path d="M0 330 C60 300 120 312 170 324 C210 334 240 318 270 306 L270 480 L0 480 Z" fill="#A9BCF5" />
      <path d="M0 360 C70 340 150 352 270 336 L270 480 L0 480 Z" fill="#3158DC" />
      {/* Placas */}
      <g className="anim-sway">
        <rect x="70" y="262" width="4" height="64" rx="2" fill="#192447" />
        <rect x="46" y="244" width="52" height="34" rx="9" fill="#FFFFFF" stroke="#192447" strokeWidth="3" />
        <text x="72" y="268" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3158DC" fontFamily="system-ui, sans-serif">A</text>
      </g>
      <g className="anim-sway" style={{ animationDelay: "-2s" }}>
        <rect x="196" y="256" width="4" height="64" rx="2" fill="#192447" />
        <rect x="172" y="238" width="52" height="34" rx="9" fill="#FFFFFF" stroke="#192447" strokeWidth="3" />
        <text x="198" y="262" textAnchor="middle" fontSize="20" fontWeight="800" fill="#D2639A" fontFamily="system-ui, sans-serif">B</text>
      </g>
      {/* Personagem cartoon em dúvida */}
      <ellipse cx="135" cy="404" rx="22" ry="5" fill="#192447" opacity="0.18" />
      <g className="anim-float" style={{ animationDuration: "6s" }}>
        <rect x="120" y="352" width="30" height="40" rx="12" fill="#F5A7CA" stroke="#192447" strokeWidth="3" />
        <rect x="123" y="388" width="9" height="16" rx="4" fill="#192447" />
        <rect x="138" y="388" width="9" height="16" rx="4" fill="#192447" />
        <circle cx="135" cy="334" r="20" fill="#FFE2CC" stroke="#192447" strokeWidth="3" />
        <path d="M117 328 q18 -22 36 0" fill="#192447" />
        <g className="anim-blink">
          <circle cx="128" cy="336" r="2.6" fill="#192447" />
          <circle cx="142" cy="336" r="2.6" fill="#192447" />
        </g>
        <path d="M130 345 q5 -2 10 0" fill="none" stroke="#192447" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M150 360 q14 -8 16 -24" fill="none" stroke="#192447" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Balão */}
      <g>
        <rect x="150" y="286" width="72" height="30" rx="15" fill="#FFFFFF" stroke="#192447" strokeWidth="2.5" />
        <path d="M160 314 l-6 10 l14 -8" fill="#FFFFFF" stroke="#192447" strokeWidth="2.5" strokeLinejoin="round" />
        <text x="186" y="306" textAnchor="middle" fontSize="13" fontWeight="800" fill="#192447" fontFamily="system-ui, sans-serif">E agora?</text>
      </g>
      <text x="135" y="452" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="800" fontFamily="system-ui, sans-serif">
        Comenta A ou B
      </text>
    </svg>
  );
}
