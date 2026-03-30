import type { IconProps } from "./iconTypes";
export function ThreeDrivesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,20 5,13 7,17 10,9 12,14 15,5 17,10 20,3"/>
      <text x="4" y="12" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
      <text x="10" y="8" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
      <text x="15.5" y="4" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
    </svg>
  );
}
