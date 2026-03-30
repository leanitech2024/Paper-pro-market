import type { IconProps } from "./iconTypes";
export function CypherPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,18 6,9 11,16 17,3 21,14"/>
      <text x="1" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">X</text>
      <text x="5" y="7.5" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">A</text>
      <text x="10" y="21" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">B</text>
      <text x="16.5" y="2" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">C</text>
      <text x="20" y="20" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">D</text>
    </svg>
  );
}
