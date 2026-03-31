import type { IconProps } from "./iconTypes";
export function PriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="12" y1="3" x2="12" y2="21"/>

                <polyline points="9,6 12,3 15,6"/>

                <polyline points="9,18 12,21 15,18"/>

                <line x1="8" y1="3"  x2="16" y2="3"  strokeWidth="1.5"/>
                <line x1="8" y1="21" x2="16" y2="21" strokeWidth="1.5"/>

                <path d="M 17 5 L 20 5 L 20 19 L 17 19" fill="none" strokeWidth="1.2"/>
    </svg>
  );
}
