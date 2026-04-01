import type { IconProps } from "./iconTypes";
export function FibExtensionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="18" y2="6"/>

                <line x1="3" y1="21" x2="18" y2="21" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="15" x2="18" y2="15" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="10" x2="18" y2="10" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="6"  x2="18" y2="6"  strokeDasharray="1.5 1.5" strokeWidth="1"/>

                <line x1="3" y1="3"  x2="21" y2="3"  strokeWidth="1.2"/>
                <line x1="3" y1="1"  x2="21" y2="1"  strokeWidth="1.2"/>

                <polyline points="19,5 21,3 19,1" strokeWidth="1.2"/>
    </svg>
  );
}
