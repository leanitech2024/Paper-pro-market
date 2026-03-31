import type { IconProps } from "./iconTypes";
export function FibChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="19" x2="19" y2="3"/>
                <line x1="7" y1="21" x2="21" y2="7"/>

                <line x1="4" y1="21" x2="21" y2="4.5" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="5.5" y1="21" x2="21" y2="5.5" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="4" y1="18" x2="18" y2="5" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
