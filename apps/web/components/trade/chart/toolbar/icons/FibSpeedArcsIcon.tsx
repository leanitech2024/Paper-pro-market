import type { IconProps } from "./iconTypes";
export function FibSpeedArcsIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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

                <path d="M 3 15 Q 6 15 9 21" fill="none"/>

                <path d="M 3 11 Q 9 11 14 21" fill="none"/>

                <path d="M 3 7 Q 12 7 19 21" fill="none"/>

                <path d="M 3 3 Q 15 3 22 21" fill="none"/>
    </svg>
  );
}
