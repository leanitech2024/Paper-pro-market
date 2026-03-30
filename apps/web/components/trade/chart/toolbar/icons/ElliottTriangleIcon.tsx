import type { IconProps } from "./iconTypes";
export function ElliottTriangleIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,4 7,16 11,9 15,15 18,11"/>
      <line x1="2" y1="19" x2="22" y2="13" strokeDasharray="2 1.5"/>
      <line x1="2" y1="9" x2="22" y2="13" strokeDasharray="2 1.5"/>
      <text x="1" y="3.5" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">A</text>
      <text x="7" y="21" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">B</text>
      <text x="10" y="8" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">C</text>
      <text x="14.5" y="21" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">D</text>
      <text x="18" y="10" fontSize="3.2" fill="currentColor" stroke="none" fontFamily="sans-serif">E</text>
    </svg>
  );
}
