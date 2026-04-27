import type { IconProps } from "./iconTypes";
export function DisjointChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="14" x2="21" y2="3"/>

                <line x1="3" y1="21" x2="21" y2="15"/>

                <line x1="12" y1="8.5"  x2="12" y2="18" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="6"  y1="11.5" x2="6"  y2="19.5" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="18" y1="5.5"  x2="18" y2="16"   strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}
