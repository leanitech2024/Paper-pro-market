import type { IconProps } from "./iconTypes";
export function FibTimeZoneIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1"/>

                <line x1="3"  y1="5" x2="3"  y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="6"  y1="5" x2="6"  y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="10" y1="5" x2="10" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="15" y1="5" x2="15" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="21" y1="5" x2="21" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
