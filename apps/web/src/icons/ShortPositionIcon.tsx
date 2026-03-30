import type { IconProps } from "./iconTypes";
export function ShortPositionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="2" y="2" width="18" height="9" rx="1" fill="currentColor" fillOpacity="0.4"/>
      <rect x="2" y="13" width="18" height="9" rx="1" fill="currentColor" fillOpacity="0.15"/>
      <line x1="2" y1="12" x2="20" y2="12"/>
      <polyline points="17,17 20,20 23,17"/>
      <line x1="20" y1="4" x2="20" y2="20"/>
    </svg>
  );
}
