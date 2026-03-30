import type { IconProps } from "./iconTypes";
export function CyclicLinesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="2" y1="20" x2="22" y2="20"/>
      <line x1="5" y1="9" x2="5" y2="20"/>
      <line x1="10" y1="9" x2="10" y2="20"/>
      <line x1="15" y1="9" x2="15" y2="20"/>
      <line x1="20" y1="9" x2="20" y2="20"/>
      <path d="M2 14 Q5 8 10 14 Q15 20 20 14"/>
    </svg>
  );
}
