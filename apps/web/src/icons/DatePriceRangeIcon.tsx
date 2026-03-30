import type { IconProps } from "./iconTypes";
export function DatePriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="3" x2="3" y2="21"/>
      <line x1="3" y1="21" x2="21" y2="21"/>
      <polyline points="3,7 6,4 9,7"/>
      <polyline points="6,3 3,3"/>
      <polyline points="17,21 20,18 23,21"/>
      <line x1="21" y1="21" x2="21" y2="18"/>
      <line x1="7" y1="21" x2="7" y2="24"/>
      <line x1="3" y1="11" x2="0" y2="11"/>
    </svg>
  );
}
