import type { IconProps } from "./iconTypes";
export function ElliottCorrectionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="5" x2="9" y2="15"/>

                <line x1="9" y1="15" x2="14" y2="10"/>

                <line x1="14" y1="10" x2="21" y2="20"/>

                <circle cx="2"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="20" r="1.2" fill="currentColor" stroke="none"/>

                <text x="4"  y="9"   fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">A</text>
                <text x="10" y="11"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">B</text>
                <text x="16" y="14"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="700">C</text>
    </svg>
  );
}
