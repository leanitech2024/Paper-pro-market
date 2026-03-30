import type { IconProps } from "./iconTypes";
export function TimeCyclesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="19" x2="21" y2="19"/>
      <path d="M3 19 A9 9 0 0 1 21 19"/>
      <line x1="12" y1="10" x2="12" y2="8"/>
      <line x1="7.5" y1="11.5" x2="6.3" y2="10.3"/>
      <line x1="16.5" y1="11.5" x2="17.7" y2="10.3"/>
      <line x1="5.5" y1="15" x2="3.5" y2="15"/>
      <line x1="18.5" y1="15" x2="20.5" y2="15"/>
    </svg>
  );
}
