import type { IconProps } from "./iconTypes";
export function InsidePitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="4" y1="20" x2="20" y2="4"/>
      <line x1="4" y1="20" x2="18" y2="6"/>
      <line x1="4" y1="20" x2="20" y2="10"/>
    </svg>
  );
}
