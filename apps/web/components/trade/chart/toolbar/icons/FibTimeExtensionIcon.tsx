import type { IconProps } from "./iconTypes";
export function FibTimeExtensionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="13" x2="22" y2="13" strokeWidth="1"/>

                <line x1="2" y1="8" x2="10" y2="8" strokeWidth="1.5"/>

                <line x1="2"  y1="6" x2="2"  y2="10" strokeWidth="1.5"/>
                <line x1="10" y1="6" x2="10" y2="10" strokeWidth="1.5"/>

                <line x1="14" y1="10" x2="14" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>
                <line x1="18" y1="10" x2="18" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>
                <line x1="22" y1="10" x2="22" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>

                <polyline points="20,13 22,13" strokeWidth="1.5"/>
                <polyline points="20,11 22,13 20,15" strokeWidth="1.2"/>
    </svg>
  );
}
