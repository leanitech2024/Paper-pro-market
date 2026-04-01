import type { IconProps } from "./iconTypes";
export function AnchoredTextIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <text x="5" y="14" fontSize="11" fontWeight="500" fill="currentColor" stroke="none" fontFamily="sans-serif">T</text>
      <line x1="12" y1="16" x2="12" y2="20"/>
      <circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none"/>
      <line x1="10" y1="20" x2="14" y2="20"/>
    </svg>
  );
}
