import type { IconProps } from "./iconTypes";
export function CypherPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 7,8 11,14 16,2 21,13"/>

                <circle cx="2"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="8"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="11" cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="2"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="13" r="1.2" fill="currentColor" stroke="none"/>

                <text x="0"  y="22"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">X</text>
                <text x="6"  y="7"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">A</text>
                <text x="10" cy="19" y="20" fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">B</text>
                <text x="15" y="2"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">C</text>
                <text x="20" y="17"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">D</text>

                <line x1="2" y1="19" x2="16" y2="2" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}
