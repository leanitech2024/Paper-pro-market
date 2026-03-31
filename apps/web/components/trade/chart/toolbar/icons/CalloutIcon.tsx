import type { IconProps } from "./iconTypes";
export function CalloutIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 3 4 L 21 4 Q 22 4 22 5 L 22 14 Q 22 15 21 15 L 9 15 L 5 20 L 6 15 L 3 15 Q 2 15 2 14 L 2 5 Q 2 4 3 4 Z"/>

                <line x1="5" y1="8"  x2="19" y2="8"  strokeWidth="0.8"/>
                <line x1="5" y1="11" x2="15" y2="11" strokeWidth="0.8"/>
    </svg>
  );
}
