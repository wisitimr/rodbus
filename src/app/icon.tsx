import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
      >
        {/* Bus body */}
        <rect x="4" y="8" width="28" height="18" rx="4" fill="#facc15" />
        {/* Windows */}
        <rect x="8" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
        <rect x="16" y="12" width="6" height="6" rx="1.5" fill="white" opacity="0.9" />
        {/* Door */}
        <rect x="24" y="12" width="5" height="10" rx="1.5" fill="white" opacity="0.7" />
        {/* Headlight */}
        <rect x="5" y="20" width="3" height="2" rx="1" fill="#fef08a" />
        {/* Wheels */}
        <circle cx="12" cy="27" r="3" fill="#1a1a1a" />
        <circle cx="12" cy="27" r="1.5" fill="#ffffff" />
        <circle cx="26" cy="27" r="3" fill="#1a1a1a" />
        <circle cx="26" cy="27" r="1.5" fill="#ffffff" />
        {/* Roof stripe */}
        <rect x="6" y="8" width="24" height="2.5" rx="1.25" fill="#eab308" />
      </svg>
    ),
    { ...size },
  );
}
