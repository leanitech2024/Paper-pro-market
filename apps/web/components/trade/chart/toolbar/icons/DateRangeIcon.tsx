import type { IconProps } from "./iconTypes";
export function DateRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="12" x2="21" y2="12"/>

                <polyline points="6,9 3,12 6,15"/>

                <polyline points="18,9 21,12 18,15"/>

                <line x1="3"  y1="8" x2="3"  y2="16" strokeWidth="1.5"/>
                <line x1="21" y1="8" x2="21" y2="16" strokeWidth="1.5"/>

                <rect x="9" y="15" width="6" height="5" rx="1" strokeWidth="1"/>
                <line x1="9"  y1="17" x2="15" y2="17" strokeWidth="0.8"/>
                <line x1="12" y1="15" x2="12" y2="20" strokeWidth="0.8"/>
    </svg>
  );
}
