import type { IconProps } from "./iconTypes";
export function AbcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="3,5 10,19 17,7 22,19"/>

                <circle cx="3"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="17" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="22" cy="19" r="1.2" fill="currentColor" stroke="none"/>

                <text x="1"  y="4"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">A</text>
                <text x="9"  y="23"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">B</text>
                <text x="16" y="6"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">C</text>
                <text x="21" y="23"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">D</text>

                <line x1="5.5" y1="11" x2="7.5" y2="11" strokeWidth="1" transform="rotate(-66, 6.5, 11)"/>
                <line x1="5.5" y1="13" x2="7.5" y2="13" strokeWidth="1" transform="rotate(-66, 6.5, 13)"/>
                <line x1="18.5" y1="11" x2="20.5" y2="11" strokeWidth="1" transform="rotate(66, 19.5, 11)"/>
                <line x1="18.5" y1="13" x2="20.5" y2="13" strokeWidth="1" transform="rotate(66, 19.5, 13)"/>
    </svg>
  );
}
