import type { IconProps } from "./iconTypes";
export function SchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="7" y1="16" x2="20" y2="4"/>
      <line x1="7" y1="16" x2="16" y2="2"/>
      <line x1="7" y1="16" x2="22" y2="8"/>
      <line x1="4" y1="13" x2="10" y2="19"/>
      <line x1="5" y1="16" x2="9" y2="16"/>
    </svg>
  );
}
