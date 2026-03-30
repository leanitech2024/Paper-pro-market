import type { IconProps } from "./iconTypes";
export function FibSpeedArcsIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <path d="M3 21 Q3 15 9 15"/>
      <path d="M3 21 Q3 10 14 10"/>
      <path d="M3 21 Q3 5 19 5"/>
      <path d="M3 21 Q6 3 21 3"/>
    </svg>
  );
}
