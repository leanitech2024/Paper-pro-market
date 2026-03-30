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
      <line x1="3" y1="19" x2="21" y2="5"/>
      <circle cx="5" cy="17" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="8" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="11" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="20" cy="10" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
