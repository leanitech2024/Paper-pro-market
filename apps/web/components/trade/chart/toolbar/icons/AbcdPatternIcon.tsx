import type { IconProps } from "./iconTypes";
export function AbcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="3,6 9,18 15,8 21,20"/>
      <text x="2" y="5" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">A</text>
      <text x="8.5" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">B</text>
      <text x="14" y="7" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">C</text>
      <text x="20" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">D</text>
    </svg>
  );
}
