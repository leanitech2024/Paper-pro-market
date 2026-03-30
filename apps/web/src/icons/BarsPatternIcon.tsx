import type { IconProps } from "./iconTypes";
export function BarsPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <line x1="4" y1="6" x2="4" y2="14"/>
      <line x1="3" y1="8" x2="5" y2="8"/>
      <line x1="3" y1="12" x2="5" y2="12"/>
      <line x1="7" y1="4" x2="7" y2="16"/>
      <line x1="6" y1="6" x2="8" y2="6"/>
      <line x1="6" y1="14" x2="8" y2="14"/>
      <line x1="10" y1="7" x2="10" y2="18"/>
      <line x1="9" y1="9" x2="11" y2="9"/>
      <line x1="9" y1="17" x2="11" y2="17"/>
      <line x1="11.5" y1="11" x2="14" y2="11" strokeDasharray="1.5 1.5"/>
      <line x1="15" y1="8" x2="15" y2="18" strokeDasharray="2 1.5"/>
      <line x1="14" y1="10" x2="16" y2="10" strokeDasharray="2 1.5"/>
      <line x1="14" y1="17" x2="16" y2="17" strokeDasharray="2 1.5"/>
      <line x1="18" y1="6" x2="18" y2="16" strokeDasharray="2 1.5"/>
      <line x1="17" y1="8" x2="19" y2="8" strokeDasharray="2 1.5"/>
      <line x1="17" y1="15" x2="19" y2="15" strokeDasharray="2 1.5"/>
      <line x1="21" y1="5" x2="21" y2="14" strokeDasharray="2 1.5"/>
      <line x1="20" y1="7" x2="22" y2="7" strokeDasharray="2 1.5"/>
      <line x1="20" y1="13" x2="22" y2="13" strokeDasharray="2 1.5"/>
    </svg>
  );
}
