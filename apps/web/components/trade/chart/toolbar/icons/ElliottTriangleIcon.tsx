import type { IconProps } from "./iconTypes";
export function ElliottTriangleIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="5" x2="7" y2="17"/>

                <line x1="7" y1="17" x2="12" y2="8"/>

                <line x1="12" y1="8" x2="16" y2="15"/>

                <line x1="16" y1="15" x2="19" y2="10"/>

                <line x1="19" y1="10" x2="22" y2="13"/>

                <line x1="2" y1="5" x2="22" y2="10" strokeDasharray="2 1.5" strokeWidth="0.8"/>

                <line x1="7" y1="17" x2="22" y2="13" strokeDasharray="2 1.5" strokeWidth="0.8"/>

                <circle cx="2"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="17" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="8"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="19" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="22" cy="13" r="1.2" fill="currentColor" stroke="none"/>

                <text x="1"  y="4"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">A</text>
                <text x="6"  y="22"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">B</text>
                <text x="11" y="7"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">C</text>
                <text x="15" y="20"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">D</text>
                <text x="19" y="9"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">E</text>
    </svg>
  );
}
