import type { IconProps } from "./iconTypes";
export function SignpostIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="12" y1="4" x2="12" y2="21"/>

                <polygon points="4,8 18,8 22,12 18,16 4,16"/>

                <line x1="7" y1="12" x2="15" y2="12" strokeWidth="0.8"/>
    </svg>
  );
}
