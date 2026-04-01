import type { IconProps } from "./iconTypes";
export function FibSpeedFanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>

                <line x1="3" y1="21" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="21" y2="8"/>
                <line x1="3" y1="21" x2="21" y2="13"/>
                <line x1="3" y1="21" x2="21" y2="17"/>
                <line x1="3" y1="21" x2="21" y2="21"/>
    </svg>
  );
}
