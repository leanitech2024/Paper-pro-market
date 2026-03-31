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
                <path d="M 3 18 C 8 18 10 4 21 6" fill="none"/>

                <circle cx="3"  cy="18" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="6"  r="1.2" fill="currentColor" stroke="none"/>

                <line x1="3"  y1="18" x2="8"  y2="18" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="21" y1="6" x2="10" y2="4" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}
