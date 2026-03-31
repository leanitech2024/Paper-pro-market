import type { IconProps } from "./iconTypes";
export function HeadAndShouldersIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="18" x2="22" y2="18" strokeDasharray="2 1.5" strokeWidth="1"/>

                <polyline points="2,18 5,13 8,18"/>

                <polyline points="8,18 12,4 16,18"/>

                <polyline points="16,18 19,13 22,18"/>
    </svg>
  );
}
