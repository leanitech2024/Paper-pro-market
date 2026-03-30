import type { IconProps } from "./iconTypes";
export function HeadAndShouldersIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="1,18 4,18 6,13 8,18 10,18 12,5 14,18 16,18 18,11 20,18 23,18"/>
      <line x1="1" y1="18" x2="23" y2="18"/>
    </svg>
  );
}
