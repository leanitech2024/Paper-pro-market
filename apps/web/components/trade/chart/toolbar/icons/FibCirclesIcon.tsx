import type { IconProps } from "./iconTypes";
export function FibCirclesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="12" cy="12" r="2.5"/>
                <circle cx="12" cy="12" r="5.5"/>
                <circle cx="12" cy="12" r="9"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
