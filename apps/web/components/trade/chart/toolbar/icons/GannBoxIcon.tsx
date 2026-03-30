import type { IconProps } from "./iconTypes";
export function GannBoxIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="2" y="2" width="20" height="20" rx="1"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
      <line x1="22" y1="2" x2="2" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  );
}
