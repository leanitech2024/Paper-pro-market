import type { IconProps } from "./iconTypes";
export function ElliottDoubleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2"  y1="6"  x2="6"  y2="14"/>
                <line x1="6"  y1="14" x2="9"  y2="10"/>

                <line x1="9"  y1="10" x2="13" y2="14"/>

                <line x1="13" y1="14" x2="17" y2="20"/>
                <line x1="17" y1="20" x2="21" y2="16"/>

                <circle cx="2"  cy="6"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="16" r="1.2" fill="currentColor" stroke="none"/>

                <text x="3"  y="5"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">W</text>
                <text x="10" y="9"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">X</text>
                <text x="15" y="13"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">Y</text>

                <line x1="9"  y1="6" x2="9"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="13" y1="6" x2="13" y2="22" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}
