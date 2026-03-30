import type { IconProps } from "./iconTypes";
export function DateRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="9" x2="3" y2="15"/>
      <line x1="21" y1="9" x2="21" y2="15"/>
      <polyline points="7,9 3,12 7,15"/>
      <polyline points="17,9 21,12 17,15"/>
      <rect x="8" y="16" width="8" height="6" rx="1"/>
      <line x1="10" y1="16" x2="10" y2="22"/>
      <line x1="14" y1="16" x2="14" y2="22"/>
      <line x1="8" y1="19" x2="16" y2="19"/>
    </svg>
  );
}
