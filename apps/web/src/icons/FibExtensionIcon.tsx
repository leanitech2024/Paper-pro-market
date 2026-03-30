import type { IconProps } from "./iconTypes";
export function FibExtensionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="3" y1="19" x2="17" y2="5"/>
      <line x1="3" y1="16" x2="13" y2="16" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="11" x2="9" y2="11" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="6" x2="16" y2="6" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="3" x2="21" y2="3" strokeDasharray="1.5 1.5"/>
      <line x1="3" y1="1" x2="21" y2="1" strokeDasharray="1.5 1.5"/>
    </svg>
  );
}
