const nodes = [
  [119, 37], [105, 55], [133, 65], [113, 82], [146, 96], [127, 113],
  [158, 128], [142, 148], [171, 163], [158, 181], [184, 198], [171, 218],
  [194, 233], [186, 253], [205, 271], [191, 291], [214, 309], [199, 329],
  [218, 347], [205, 368], [185, 385], [166, 374], [146, 356], [129, 331],
  [112, 309], [93, 287], [74, 268], [58, 247], [44, 222], [36, 198],
];

export function ItalyVisual() {
  return (
    <div className="italy-visual" aria-label="Visualizzazione stilizzata della copertura nazionale">
      <svg viewBox="0 0 260 430" role="img" aria-hidden="true">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="boot" x1="0" x2="1">
            <stop offset="0" stopColor="#0b3657" stopOpacity=".72" />
            <stop offset=".5" stopColor="#136ca2" stopOpacity=".45" />
            <stop offset="1" stopColor="#0b3657" stopOpacity=".7" />
          </linearGradient>
        </defs>

        <path
          className="boot"
          d="M91 23 128 22 143 37 140 59 156 71 151 91 163 111 158 132 179 151 174 169 190 186 185 203 207 219 201 240 219 259 213 281 228 301 219 321 229 341 215 362 198 374 179 369 166 351 147 343 132 322 112 310 95 292 77 279 63 261 45 248 36 224 29 203 34 180 46 165 51 143 61 122 64 101 78 83 74 61 83 45Z"
          fill="url(#boot)"
          stroke="#2e8bc0"
          strokeWidth="1.4"
        />
        <path
          d="M118 379c18 2 31 11 41 25-18 4-36 1-53-8 1-8 5-13 12-17Zm80-25c13-1 25 4 35 14-10 8-23 12-38 10-2-9-1-17 3-24Z"
          fill="#0d4267"
          stroke="#2e8bc0"
          strokeWidth="1.2"
        />

        {nodes.slice(0, -1).map((node, index) => {
          const next = nodes[index + 1];
          return (
            <line
              key={`line-${node[0]}-${node[1]}`}
              x1={node[0]}
              y1={node[1]}
              x2={next[0]}
              y2={next[1]}
              stroke="#2596d1"
              strokeOpacity=".35"
              strokeWidth=".8"
            />
          );
        })}

        {nodes.map(([x, y], index) => (
          <g key={`${x}-${y}`} filter={index % 4 === 0 ? "url(#glow)" : undefined}>
            <circle cx={x} cy={y} r={index % 4 === 0 ? 3 : 1.7} fill="#7dd3fc" />
          </g>
        ))}
      </svg>

      <div className="map-orbit map-orbit-one" />
      <div className="map-orbit map-orbit-two" />
      <div className="map-label map-label-north">
        <b>ENTI</b>
        <span>anagrafe nazionale</span>
      </div>
      <div className="map-label map-label-center">
        <b>SPESA</b>
        <span>flussi e bilanci</span>
      </div>
      <div className="map-label map-label-south">
        <b>PROGETTI</b>
        <span>CUP · PNRR · coesione</span>
      </div>
    </div>
  );
}
