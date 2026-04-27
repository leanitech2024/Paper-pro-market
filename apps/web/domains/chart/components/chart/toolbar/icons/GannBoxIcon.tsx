import type { IconProps } from "./iconTypes";
export function GannBoxIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <rect x="3" y="3" width="18" height="18" rx="1"/>

                <line x1="3" y1="3"  x2="21" y2="21"/>
                <line x1="21" y1="3" x2="3"  y2="21"/>

                <line x1="3" y1="12" x2="21" y2="12"/>

                <line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
  );
}
