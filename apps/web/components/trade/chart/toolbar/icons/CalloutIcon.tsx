import type { IconProps } from "./iconTypes";
export function CalloutIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="2" y="3" width="17" height="11" rx="2.5"/>
      <polyline points="5,14 3,20 9,16"/>
      <line x1="6" y1="8" x2="14" y2="8"/>
      <line x1="6" y1="11" x2="11" y2="11"/>
    </svg>
  );
}
