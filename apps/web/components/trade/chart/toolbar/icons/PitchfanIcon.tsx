import type { IconProps } from "./iconTypes";
export function PitchfanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="10" y2="10"/>

                <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/>

                <line x1="10" y1="10" x2="21" y2="3"/>
                <line x1="10" y1="10" x2="21" y2="8"/>
                <line x1="10" y1="10" x2="21" y2="13"/>
                <line x1="10" y1="10" x2="21" y2="18"/>

                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
