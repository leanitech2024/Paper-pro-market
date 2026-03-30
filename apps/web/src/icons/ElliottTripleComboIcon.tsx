import type { IconProps } from "./iconTypes";
export function ElliottTripleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,5 4,12 5.5,9 7,14"/>
      <line x1="7" y1="14" x2="8.5" y2="11"/>
      <polyline points="8.5,11 10,16 11,13 12.5,17"/>
      <line x1="12.5" y1="17" x2="14" y2="13"/>
      <polyline points="14,13 16,19 17.5,15 20,21"/>
      <text x="1" y="4.5" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">W</text>
      <text x="7.5" y="10" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">X</text>
      <text x="12" y="16" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">Y</text>
      <text x="13.5" y="12.5" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">X</text>
      <text x="19" y="23" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">Z</text>
    </svg>
  );
}
