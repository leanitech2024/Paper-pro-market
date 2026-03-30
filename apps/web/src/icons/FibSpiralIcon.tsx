import type { IconProps } from "./iconTypes";
export function FibSpiralIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <path d="M12 12 Q12 9.5 14.5 9.5 Q18.5 9.5 18.5 12 Q18.5 17 12 17 Q6 17 6 11.5 Q6 5.5 12.5 5.5 Q20 5.5 20.5 13"/>
    </svg>
  );
}
