import type { IconProps } from "./iconTypes";
export function PolylineIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="3,18 8,8 13,14 18,6 21,10"/>

                <circle cx="3"  cy="18" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="8"  cy="8"  r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="14" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="6"  r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="10" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
