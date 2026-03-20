import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          borderRadius: "36px",
        }}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="120"
          height="120"
        >
          {/* Bus body */}
          <rect x="4" y="8" width="28" height="18" rx="4" fill="#facc15" />
          {/* Windows */}
          <rect x="8" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
          <rect x="16" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
          {/* Door */}
          <rect x="24" y="12" width="5" height="10" rx="1.5" fill="white" opacity="0.7" />
          {/* Skirt (red lower body panel) */}
          <rect x="4" y="23" width="28" height="3" fill="#ef4444" />
          {/* Headlight */}
          <rect x="5" y="20" width="3" height="2" rx="1" fill="#fef08a" />
          {/* Wheels */}
          <circle cx="12" cy="27" r="3" fill="#1a1a1a" />
          <circle cx="12" cy="27" r="1.5" fill="white" />
          <circle cx="26" cy="27" r="3" fill="#1a1a1a" />
          <circle cx="26" cy="27" r="1.5" fill="white" />
          {/* Roof stripe */}
          <rect x="6" y="8" width="24" height="2.5" rx="1.25" fill="#eab308" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
