import type { IconProps } from "./iconTypes";
export function DatePriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="5" y1="3" x2="5" y2="19"/>

                <polyline points="3,6 5,3 7,6"/>

                <line x1="3" y1="3" x2="7" y2="3" strokeWidth="1.5"/>

                <line x1="5" y1="19" x2="21" y2="19"/>

                <polyline points="18,17 21,19 18,21"/>

                <line x1="21" y1="17" x2="21" y2="21" strokeWidth="1.5"/>

                <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/>

                <line x1="5" y1="3" x2="21" y2="19" strokeDasharray="2 1.5" strokeWidth="0.8"/>
    </svg>
  );
}
