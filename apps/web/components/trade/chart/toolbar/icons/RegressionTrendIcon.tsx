import type { IconProps } from "./iconTypes";
export function RegressionTrendIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="20" x2="21" y2="4" strokeWidth="1.8"/>

                <circle cx="4"  cy="17" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="8"  cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="9"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="20" cy="5"  r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
