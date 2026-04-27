import type { IconProps } from "./iconTypes";
export function FibRetracementIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="21" y2="3"/>

                <line x1="3" y1="21" x2="21" y2="21" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="17" x2="21" y2="17" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="13" x2="21" y2="13" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="9"  x2="21" y2="9"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="5"  x2="21" y2="5"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="3"  x2="21" y2="3"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
    </svg>
  );
}
