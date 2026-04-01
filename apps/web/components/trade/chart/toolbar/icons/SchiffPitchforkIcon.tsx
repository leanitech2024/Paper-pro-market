import type { IconProps } from "./iconTypes";
export function SchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="6" y1="14" x2="10" y2="14" strokeWidth="1.5"/>

                <line x1="8" y1="14" x2="20" y2="4"/>

                <line x1="14" y1="9" x2="20" y2="6"/>

                <line x1="14" y1="9" x2="20" y2="12"/>

                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>

                <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>

                <line x1="4" y1="20" x2="12" y2="8" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
