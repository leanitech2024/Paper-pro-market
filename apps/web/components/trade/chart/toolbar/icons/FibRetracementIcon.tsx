import type { IconProps } from "./iconTypes";
export function FibRetracementIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="18" x2="13" y2="18" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="14.5" x2="10" y2="14.5" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="11" x2="7" y2="11" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="7.5" x2="17" y2="7.5" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="3" x2="21" y2="3" strokeDasharray="1.5 1.5"/>
    </svg>
  );
}
