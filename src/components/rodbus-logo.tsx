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
      viewBox="0 0 100 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="รถบัส"
    >
      {/* รถ — yellow hand-drawn style */}
      <g
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-yellow-500"
        fill="none"
      >
        {/* ร — stem with rounded head loop */}
        <path d="M 6 33 V 20 C 6 10 18 10 18 18 C 18 24 8 24 6 20" />
        {/* ถ — oval body */}
        <ellipse cx="32" cy="23" rx="8" ry="10" />
        {/* ถ — ascending stroke */}
        <path d="M 38 14 V 5" />
      </g>
      {/* บัส — primary blue */}
      <g
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
        fill="none"
      >
        {/* บ — rounded arch */}
        <path d="M 50 33 V 16 Q 50 6 58 6 Q 66 6 66 16 V 33" />
        {/* ั — mai han akat mark */}
        <path d="M 58 3.5 V 1" />
        {/* ส — serpentine curve */}
        <path d="M 74 33 C 74 22 90 26 90 16 C 90 6 76 5 74 14" />
      </g>
    </svg>
  );
}
