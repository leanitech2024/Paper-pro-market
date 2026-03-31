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
                <path d="M 12 12 Q 14 12 14 10" fill="none"/>

                <path d="M 14 10 Q 14 7 11 7" fill="none"/>

                <path d="M 11 7 Q 6 7 6 12" fill="none"/>

                <path d="M 6 12 Q 6 18 13 18" fill="none"/>

                <path d="M 13 18 Q 21 18 21 10" fill="none"/>

                <path d="M 21 10 Q 21 3 12 3" fill="none"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
