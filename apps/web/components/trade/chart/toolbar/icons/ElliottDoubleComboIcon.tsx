import type { IconProps } from "./iconTypes";
export function ElliottDoubleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,5 5,14 7,10 10,18"/>
      <line x1="10" y1="18" x2="13" y2="13"/>
      <polyline points="13,13 15,19 17,14 20,20"/>
      <text x="1" y="4.5" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">W</text>
      <text x="10.5" y="12" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">X</text>
      <text x="19" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">Y</text>
    </svg>
  );
}
