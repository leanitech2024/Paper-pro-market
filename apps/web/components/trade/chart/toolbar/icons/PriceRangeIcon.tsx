import type { IconProps } from "./iconTypes";
export function PriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="12" y1="3" x2="12" y2="21"/>
      <line x1="9" y1="3" x2="15" y2="3"/>
      <line x1="9" y1="21" x2="15" y2="21"/>
      <polyline points="9,7 12,3 15,7"/>
      <polyline points="9,17 12,21 15,17"/>
      <line x1="16" y1="8" x2="20" y2="8"/>
      <line x1="16" y1="12" x2="22" y2="12"/>
      <line x1="16" y1="16" x2="20" y2="16"/>
    </svg>
  );
}
