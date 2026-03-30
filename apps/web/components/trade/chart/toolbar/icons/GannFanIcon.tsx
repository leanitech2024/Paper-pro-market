import type { IconProps } from "./iconTypes";
export function GannFanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="21" x2="21" y2="3"/>
      <line x1="3" y1="21" x2="21" y2="7"/>
      <line x1="3" y1="21" x2="21" y2="12"/>
      <line x1="3" y1="21" x2="21" y2="17"/>
      <line x1="3" y1="21" x2="13" y2="3"/>
      <line x1="3" y1="21" x2="8" y2="3"/>
    </svg>
  );
}
