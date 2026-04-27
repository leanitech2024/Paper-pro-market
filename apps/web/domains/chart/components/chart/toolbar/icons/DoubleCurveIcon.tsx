import type { IconProps } from "./iconTypes";
export function DoubleCurveIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 3 15 C 7 15 9 6 13 6" fill="none"/>

                <path d="M 11 18 C 15 18 17 9 21 9" fill="none"/>

                <circle cx="3"  cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="6"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="11" cy="18" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="9"  r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
