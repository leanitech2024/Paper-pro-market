import type { IconProps } from "./iconTypes";
export function ElliottImpulseIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <polyline points="2,20 6,12 9,16 13,6 16,11 20,3"/>
      <text x="2" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
      <text x="5.5" y="10.5" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
      <text x="9" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
      <text x="13" y="23" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">4</text>
      <text x="17.5" y="2" fontSize="3.5" fill="currentColor" stroke="none" fontFamily="sans-serif">5</text>
    </svg>
  );
}
