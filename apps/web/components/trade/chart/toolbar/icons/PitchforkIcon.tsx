import type { IconProps } from "./iconTypes";
export function PitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="4" y1="20" x2="20" y2="4"/>

                <line x1="12" y1="12" x2="20" y2="8"/>

                <line x1="12" y1="12" x2="20" y2="16"/>

                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
