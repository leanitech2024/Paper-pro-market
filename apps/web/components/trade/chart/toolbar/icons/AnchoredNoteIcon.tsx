import type { IconProps } from "./iconTypes";
export function AnchoredNoteIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <rect x="3" y="5" width="14" height="13" rx="2"/>
      <line x1="7" y1="10" x2="13" y2="10"/>
      <line x1="7" y1="13" x2="11" y2="13"/>
      <circle cx="17" cy="5" r="3"/>
      <line x1="17" y1="3.5" x2="17" y2="6.5"/>
      <line x1="15.5" y1="5" x2="18.5" y2="5"/>
    </svg>
  );
}
