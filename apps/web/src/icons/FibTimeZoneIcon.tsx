import type { IconProps } from "./iconTypes";
export function FibTimeZoneIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="20" x2="21" y2="20"/>
      <line x1="4" y1="4" x2="4" y2="20" strokeDasharray="2 1.5"/>
      <line x1="7" y1="4" x2="7" y2="20" strokeDasharray="2 1.5"/>
      <line x1="11" y1="4" x2="11" y2="20" strokeDasharray="2 1.5"/>
      <line x1="16" y1="4" x2="16" y2="20" strokeDasharray="2 1.5"/>
      <line x1="22" y1="4" x2="22" y2="20" strokeDasharray="2 1.5"/>
    </svg>
  );
}
