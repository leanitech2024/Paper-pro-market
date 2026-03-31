import type { IconProps } from "./iconTypes";

export function LongPositionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={props.width ?? size}
      height={props.height ?? size}
      {...props}
    >
      {/* Top Green Box */}
      <rect
        x="3"
        y="3"
        width="16"
        height="7"
        rx="1"
        fill="#1D9E75"
        fillOpacity="0.25"
        stroke="#1D9E75"
        strokeWidth="1.2"
      />

      {/* Divider */}
      <line x1="3" y1="13" x2="19" y2="13" />

      {/* Bottom Red Box */}
      <rect
        x="3"
        y="14"
        width="16"
        height="7"
        rx="1"
        fill="#E24B4A"
        fillOpacity="0.25"
        stroke="#E24B4A"
        strokeWidth="1.2"
      />

      {/* Up Arrow */}
      <polyline points="18,8 20,6 22,8" />
      <line x1="20" y1="6" x2="20" y2="12" />
    </svg>
  );
}