import type { IconProps } from "./iconTypes";
export function CurveIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <path d="M3 17 C7 17 7 7 12 7 C17 7 17 17 21 17"/>
    </svg>
  );
}
