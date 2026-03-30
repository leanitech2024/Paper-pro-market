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
      <line x1="3" y1="21" x2="12" y2="10"/>
      <line x1="12" y1="10" x2="21" y2="3"/>
      <line x1="12" y1="10" x2="21" y2="7"/>
      <line x1="12" y1="10" x2="21" y2="12"/>
      <line x1="12" y1="10" x2="21" y2="17"/>
    </svg>
  );
}
