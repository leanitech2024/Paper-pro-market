import type { IconProps } from "./iconTypes";
export function ModifiedSchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="9" y1="14" x2="21" y2="4"/>
      <line x1="9" y1="14" x2="18" y2="2"/>
      <line x1="9" y1="14" x2="22" y2="9"/>
      <line x1="7" y1="12" x2="11" y2="16"/>
      <line x1="7" y1="16" x2="11" y2="12"/>
    </svg>
  );
}
