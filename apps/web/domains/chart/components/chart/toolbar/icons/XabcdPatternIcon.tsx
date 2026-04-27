import type { IconProps } from "./iconTypes";
export function XabcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 6,5 10,15 15,4 20,12"/>

                <circle cx="2"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="4"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none"/>

                <text x="0"  y="22"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">X</text>
                <text x="5"  y="4"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">A</text>
                <text x="9"  y="21"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">B</text>
                <text x="14" y="3"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">C</text>
                <text x="19" y="16"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">D</text>
    </svg>
  );
}
