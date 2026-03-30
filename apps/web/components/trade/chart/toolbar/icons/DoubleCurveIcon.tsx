import type { IconProps } from "./iconTypes";
export function DoubleCurveIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <path d="M3 8 C7 8 9 16 12 16"/>
      <path d="M12 16 C15 16 17 8 21 8"/>
    </svg>
  );
}
