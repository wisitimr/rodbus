export default function RodBusLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bus body */}
      <rect x="4" y="8" width="28" height="18" rx="4" className="fill-yellow-400" />
      {/* Windows */}
      <rect x="8" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
      <rect x="16" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
      {/* Door */}
      <rect x="24" y="12" width="5" height="10" rx="1.5" fill="white" opacity="0.7" />
      {/* Headlight */}
      <rect x="5" y="20" width="3" height="2" rx="1" fill="#fef08a" />
      {/* Wheels */}
      <circle cx="12" cy="27" r="3" className="fill-foreground" />
      <circle cx="12" cy="27" r="1.5" className="fill-card" />
      <circle cx="26" cy="27" r="3" className="fill-foreground" />
      <circle cx="26" cy="27" r="1.5" className="fill-card" />
      {/* Roof stripe */}
      <rect x="6" y="8" width="24" height="2.5" rx="1.25" className="fill-yellow-500" />
    </svg>
  );
}

export function RodBusWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-2 4 82 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="รถบัส"
    >
      <defs>
        <linearGradient id="rodbus-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="50%" stopColor="#4FC3F7" />
          <stop offset="100%" stopColor="#81C784" />
        </linearGradient>
      </defs>
      {/* รถ — Kanit Bold vector outlines */}
      <path
        fill="url(#rodbus-grad)"
        stroke="#E6F2FF"
        strokeWidth="1.5"
        paintOrder="stroke"
        d="M7.62 32.32Q5.63 32.32 3.84 32.03Q2.05 31.74 1.02 31.33L1.02 26.75Q2.21 27.26 3.68 27.6Q5.15 27.94 6.43 27.94Q8 27.94 8.58 27.73Q9.15 27.52 9.15 26.98Q9.15 26.27 8.24 25.9Q7.33 25.54 5.25 24.77Q3.04 23.94 1.92 22.83Q.8 21.73.8 19.74Q.8 17.38 2.7 15.89Q4.61 14.4 8.48 14.4Q10.08 14.4 11.73 14.64Q13.38 14.88 14.34 15.17L14.34 19.68Q13.31 19.23 12 19.01Q10.69 18.78 9.7 18.78Q8.48 18.78 7.71 18.98Q6.94 19.17 6.94 19.84Q6.94 20.54 7.94 20.83Q8.93 21.12 10.69 21.82Q12.58 22.53 13.57 23.22Q14.56 23.9 14.93 24.8Q15.3 25.7 15.3 27.1Q15.3 29.54 13.31 30.93Q11.33 32.32 7.62 32.32ZM25.76 32L20.8 32Q19.26 32 18.35 31.06Q17.44 30.11 17.44 28.64L17.44 26.56Q17.44 25.31 17.98 24.24Q18.53 23.17 19.81 22.75L16.9 21.86L16.9 17.31Q18.34 16.22 20.64 15.31Q22.94 14.4 25.86 14.4Q30.53 14.4 32.7 16.29Q34.88 18.18 34.88 21.6L34.88 32L28.86 32L28.86 21.79Q28.86 20.16 28.08 19.47Q27.3 18.78 25.5 18.78Q24.45 18.78 23.54 19.06Q22.62 19.33 22.02 19.78L22.02 20.03L25.38 21.09L25.38 23.9Q24.38 24.19 23.92 24.72Q23.46 25.25 23.46 26.27L23.46 27.1Q23.46 28.1 24.45 28.1L25.76 28.1L25.76 32Z"
      />
      {/* บัส — Kanit Bold vector outlines */}
      <path
        fill="url(#rodbus-grad)"
        stroke="#E6F2FF"
        strokeWidth="1.5"
        paintOrder="stroke"
        d="M46.62 32.32Q43.97 32.32 41.97 31.49Q39.97 30.66 38.86 28.94Q37.76 27.23 37.76 24.64L37.76 14.72L43.78 14.72L43.78 24.9Q43.78 26.5 44.46 27.22Q45.15 27.94 46.62 27.94Q48.13 27.94 48.8 27.22Q49.47 26.5 49.47 24.9L49.47 14.72L55.49 14.72L55.49 24.64Q55.49 27.23 54.38 28.94Q53.28 30.66 51.28 31.49Q49.28 32.32 46.62 32.32ZM57.98 12.93L46.02 12.93L46.02 7.01L50.53 7.01L50.53 9.12L58.18 9.12L57.98 12.93ZM63.62 32.32Q61.95 32.32 60.62 31.76Q59.3 31.2 58.51 29.97Q57.73 28.74 57.73 26.75Q57.73 24 59.5 22.56Q61.28 21.12 64.48 21.12L68.83 21.12L68.83 20.67Q68.83 18.78 65.28 18.78Q62.3 18.78 59.36 19.68L59.36 15.52Q60.77 15.01 62.7 14.7Q64.64 14.4 66.46 14.4Q67.33 14.4 68.11 14.48Q68.9 14.56 69.6 14.72L76.42 14.72L76.13 19.1L74.3 19.1Q74.56 19.62 74.7 20.4Q74.85 21.18 74.85 21.92L74.85 32L68.83 32L68.83 25.22L65.86 25.22Q64.83 25.22 64.26 25.54Q63.68 25.86 63.68 26.78Q63.68 27.68 64.14 28Q64.61 28.32 65.57 28.32Q66.5 28.32 67.2 28.13L67.2 31.84Q66.56 32.06 65.7 32.19Q64.83 32.32 63.62 32.32Z"
      />
    </svg>
  );
}
