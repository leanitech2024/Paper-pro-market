import type { IconProps } from "./iconTypes";
export function XabcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,18 6,7 11,15 16,5 20,14"/>
      <text x="1" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">X</text>
      <text x="5" y="6" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">A</text>
      <text x="10" y="20" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">B</text>
      <text x="15" y="4" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">C</text>
      <text x="19.5" y="20" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">D</text>
    </svg>
  );
}
