import type { IconProps } from "./iconTypes";
export function ElliottTripleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2"  y1="5"  x2="5"  y2="12"/>
                <line x1="5"  y1="12" x2="7"  y2="9"/>

                <line x1="7"  y1="9"  x2="9"  y2="12"/>

                <line x1="9"  y1="12" x2="12" y2="17"/>
                <line x1="12" y1="17" x2="14" y2="13"/>

                <line x1="14" y1="13" x2="16" y2="16"/>

                <line x1="16" y1="16" x2="19" y2="20"/>
                <line x1="19" y1="20" x2="22" y2="17"/>

                <circle cx="2"  cy="5"  r="1"   fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="9"  r="1"   fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="12" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="14" cy="13" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="16" cy="16" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="22" cy="17" r="1"   fill="currentColor" stroke="none"/>

                <text x="2"  y="4"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">W</text>
                <text x="7"  y="8"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">X</text>
                <text x="10" y="11"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">Y</text>
                <text x="14" y="12"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">X</text>
                <text x="17" y="15"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" font-weight="700">Z</text>

                <line x1="7"  y1="4" x2="7"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="9"  y1="4" x2="9"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="14" y1="4" x2="14" y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="16" y1="4" x2="16" y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
    </svg>
  );
}
