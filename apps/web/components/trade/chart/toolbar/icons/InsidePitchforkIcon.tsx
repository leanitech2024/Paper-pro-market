import type { IconProps } from "./iconTypes";
export function InsidePitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <line x1="4" y1="20" x2="20" y2="6"/>

                <line x1="4" y1="20" x2="20" y2="2" strokeWidth="0.8" strokeDasharray="2 1.5"/>

                <line x1="4" y1="20" x2="20" y2="10" strokeWidth="0.8" strokeDasharray="2 1.5"/>

                <line x1="12" y1="13" x2="20" y2="5"/>

                <line x1="12" y1="13" x2="20" y2="7"/>

                <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
