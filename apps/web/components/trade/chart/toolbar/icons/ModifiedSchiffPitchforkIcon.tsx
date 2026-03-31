import type { IconProps } from "./iconTypes";
export function ModifiedSchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="6" y1="12" x2="10" y2="16" strokeWidth="1.2"/>
                <line x1="10" y1="12" x2="6" y2="16" strokeWidth="1.2"/>

                <line x1="8" y1="14" x2="20" y2="5"/>

                <line x1="14" y1="9.5" x2="20" y2="7"/>

                <line x1="14" y1="9.5" x2="20" y2="12"/>

                <line x1="4" y1="20" x2="12" y2="8" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
