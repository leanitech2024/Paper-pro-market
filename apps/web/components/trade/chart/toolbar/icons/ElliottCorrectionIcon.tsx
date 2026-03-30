import type { IconProps } from "./iconTypes";
export function ElliottCorrectionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,4 9,18 14,10 22,21"/>
      <text x="2" y="3.5" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">A</text>
      <text x="9.5" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">B</text>
      <text x="18.5" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">C</text>
    </svg>
  );
}
