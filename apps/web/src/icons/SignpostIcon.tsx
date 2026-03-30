import type { IconProps } from "./iconTypes";
export function SignpostIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="12" y1="8" x2="12" y2="22"/>
      <path d="M4 5 L4 11 L16 11 L20 8 L16 5 Z"/>
    </svg>
  );
}
