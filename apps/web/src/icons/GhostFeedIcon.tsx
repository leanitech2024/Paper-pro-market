import type { IconProps } from "./iconTypes";
export function GhostFeedIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="3" y="8" width="3" height="10" rx="0.5" strokeDasharray="2 1.5"/>
      <line x1="3" y1="11" x2="6" y2="11" strokeDasharray="2 1.5"/>
      <rect x="8" y="5" width="3" height="13" rx="0.5" strokeDasharray="2 1.5"/>
      <line x1="8" y1="8" x2="11" y2="8" strokeDasharray="2 1.5"/>
      <rect x="13" y="10" width="3" height="8" rx="0.5" strokeDasharray="2 1.5"/>
      <line x1="13" y1="13" x2="16" y2="13" strokeDasharray="2 1.5"/>
      <rect x="18" y="7" width="3" height="11" rx="0.5" strokeDasharray="2 1.5"/>
      <line x1="18" y1="10" x2="21" y2="10" strokeDasharray="2 1.5"/>
    </svg>
  );
}
