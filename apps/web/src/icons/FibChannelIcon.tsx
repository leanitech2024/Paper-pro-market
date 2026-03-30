import type { IconProps } from "./iconTypes";
export function FibChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="2" y1="20" x2="22" y2="8"/>
      <line x1="2" y1="16" x2="22" y2="4"/>
      <line x1="2" y1="18.4" x2="22" y2="6.4" strokeDasharray="2 1.5"/>
      <line x1="2" y1="17.2" x2="22" y2="5.2" strokeDasharray="2 1.5"/>
      <line x1="2" y1="14.8" x2="22" y2="2.8" strokeDasharray="2 1.5"/>
    </svg>
  );
}
