import type { IconProps } from "./iconTypes";
export function ThreeDrivesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 5,14 7,17"/>

                <polyline points="7,17 11,10 13,14"/>

                <polyline points="13,14 18,5 21,9"/>

                <circle cx="5"  cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="11" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="5"  r="1.2" fill="currentColor" stroke="none"/>

                <text x="4"  y="13" fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">1</text>
                <text x="10" y="9"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">2</text>
                <text x="17" y="4"  fontSize="4" fill="currentColor" fontFamily="sans-serif" font-weight="600">3</text>
    </svg>
  );
}
