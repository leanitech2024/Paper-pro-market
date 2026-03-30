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
      <polyline points="2,19 7,8 13,16 18,6 22,12"/>
      <circle cx="2" cy="19" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="7" cy="8" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="16" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="22" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
