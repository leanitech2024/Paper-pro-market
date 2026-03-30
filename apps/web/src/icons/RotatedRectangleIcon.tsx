import type { IconProps } from "./iconTypes";
export function RotatedRectangleIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="4" y="7" width="16" height="10" rx="1" transform="rotate(-28 12 12)"/>
    </svg>
  );
}
