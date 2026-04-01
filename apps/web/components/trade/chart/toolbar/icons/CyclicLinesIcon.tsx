import type { IconProps } from "./iconTypes";
export function CyclicLinesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1"/>

                <line x1="4"  y1="20" x2="4"  y2="12" strokeWidth="1.2"/>
                <line x1="9"  y1="20" x2="9"  y2="12" strokeWidth="1.2"/>
                <line x1="14" y1="20" x2="14" y2="12" strokeWidth="1.2"/>
                <line x1="19" y1="20" x2="19" y2="12" strokeWidth="1.2"/>

                <path d="M 2 16 Q 4 8 6.5 16 Q 9 22 11.5 16 Q 14 8 16.5 16 Q 19 22 22 16" fill="none" strokeWidth="1.5"/>
    </svg>
  );
}
