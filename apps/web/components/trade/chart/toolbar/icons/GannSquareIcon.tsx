import type { IconProps } from "./iconTypes";
export function GannSquareIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="10" y="10" width="4" height="4" rx="0.5"/>
      <rect x="7" y="7" width="10" height="10" rx="0.5"/>
      <rect x="3" y="3" width="18" height="18" rx="0.5"/>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
