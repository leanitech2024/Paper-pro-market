import type { IconProps } from "./iconTypes";
export function DisjointChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="2" y1="18" x2="11" y2="12"/>
      <line x1="2" y1="14" x2="11" y2="8"/>
      <line x1="13" y1="16" x2="22" y2="5"/>
      <line x1="13" y1="21" x2="22" y2="11"/>
    </svg>
  );
}
