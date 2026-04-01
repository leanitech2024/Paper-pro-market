import type { IconProps } from "./iconTypes";
export function ElliottImpulseIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="20" x2="6" y2="13"/>

                <line x1="6" y1="13" x2="9" y2="16"/>

                <line x1="9" y1="16" x2="14" y2="7"/>

                <line x1="14" y1="7" x2="17" y2="10"/>

                <line x1="17" y1="10" x2="21" y2="4"/>

                <circle cx="2"  cy="20" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="16" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="17" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="4"  r="1.2" fill="currentColor" stroke="none"/>

                <text x="3.5" y="12"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">1</text>
                <text x="7"   y="20"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">2</text>
                <text x="11"  y="9"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">3</text>
                <text x="15"  y="14"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">4</text>
                <text x="19"  y="6"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">5</text>
    </svg>
  );
}
