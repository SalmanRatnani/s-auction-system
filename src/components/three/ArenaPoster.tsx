import { useId } from "react";

/** A complete first-paint illustration, retained when 3D is unavailable. */
export function ArenaPoster() {
  const id = useId();
  return (
    <svg viewBox="0 0 640 460" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id={`${id}-court`}
          x1="150"
          y1="280"
          x2="490"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4b6e55" />
          <stop offset="1" stopColor="#142f2b" />
        </linearGradient>
        <linearGradient
          id={`${id}-frame`}
          x1="-50"
          y1="-50"
          x2="50"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#efffa6" />
          <stop offset=".4" stopColor="#a9d137" />
          <stop offset="1" stopColor="#45612e" />
        </linearGradient>
        <linearGradient
          id={`${id}-feather`}
          x1="-50"
          y1="-90"
          x2="40"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffef4" />
          <stop offset=".65" stopColor="#e2e8d5" />
          <stop offset="1" stopColor="#aebda4" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-50%"
          y="-100%"
          width="200%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <clipPath id={`${id}-strings`}>
          <ellipse rx="51" ry="67" />
        </clipPath>
      </defs>
      <ellipse
        cx="328"
        cy="383"
        rx="205"
        ry="21"
        fill="#18382a"
        opacity=".14"
        filter={`url(#${id}-shadow)`}
      />
      <path d="m91 321 324 92 145-85v14l-145 86L91 336v-15Z" fill="#122e29" />
      <path
        d="m91 321 145-85 324 92-145 85L91 321Z"
        fill={`url(#${id}-court)`}
      />
      <g stroke="#e2edca" strokeOpacity=".65" strokeWidth="1.3">
        <path d="m113 319 124-72 301 85-124 72-301-85Z" />
        <path d="m128 324 124-72m147 148 124-72m-259 45 124-72m-210 49 124-72m61 125 124-72M128 310l301 85m-204-141 301 85m-337-51 301 85" />
      </g>
      <ellipse
        cx="290"
        cy="326"
        rx="93"
        ry="16"
        fill="#0e241a"
        opacity=".24"
        filter={`url(#${id}-shadow)`}
      />
      <g transform="translate(244 145) rotate(29)">
        <path d="M0 68v122" stroke="#17362e" strokeWidth="7" />
        <path
          d="M0 187v57"
          stroke="#162e29"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path d="M-8 242H8" stroke="#cce970" strokeWidth="6" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M-8 ${192 + i * 7}l16 3`}
            stroke="#597163"
            strokeWidth="1.5"
          />
        ))}
        <ellipse rx="58" ry="77" stroke="#15382f" strokeWidth="11" />
        <ellipse
          cy="-2"
          rx="57"
          ry="76"
          stroke={`url(#${id}-frame)`}
          strokeWidth="6"
        />
        <g
          clipPath={`url(#${id}-strings)`}
          stroke="#78987d"
          strokeWidth=".9"
          opacity=".8"
        >
          {Array.from({ length: 11 }, (_, i) => (
            <path
              key={i}
              d={`M${-50 + i * 10} -75v150M-60 ${-65 + i * 13}H60`}
            />
          ))}
        </g>
      </g>
      <ellipse
        cx="427"
        cy="332"
        rx="46"
        ry="12"
        fill="#102c22"
        opacity=".2"
        filter={`url(#${id}-shadow)`}
      />
      <g transform="translate(420 214) rotate(26)">
        {Array.from({ length: 9 }, (_, i) => {
          const x = (i - 4) * 13;
          return (
            <path
              key={i}
              d={`M${(i - 4) * 3.2} -5Q${x * 0.7} -48 ${x - 6} -102Q${x} -117 ${x + 7} -102L${(i - 4) * 3.2 + 3} -5Z`}
              fill={`url(#${id}-feather)`}
              stroke="#a8b99a"
              strokeWidth=".6"
            />
          );
        })}
        <path d="M-33-51Q0-39 33-51" stroke="#c7d4b8" strokeWidth="3" />
        <ellipse cy="10" rx="17" ry="23" fill={`url(#${id}-feather)`} />
        <path d="M-16-3Q0 2 16-3" stroke="#b1d351" strokeWidth="7" />
      </g>
    </svg>
  );
}
