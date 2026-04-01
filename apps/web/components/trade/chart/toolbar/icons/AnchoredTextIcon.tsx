import type { IconProps } from "./iconTypes";
export function AnchoredTextIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="5" y1="6" x2="19" y2="6" strokeWidth="1.8"/>
                <line x1="12" y1="6" x2="12" y2="16" strokeWidth="1.8"/>

                <circle cx="12" cy="19" r="2" fill="none" strokeWidth="1.2"/>
                <line x1="12" y1="16" x2="12" y2="17" strokeWidth="1.2"/>
                <circle cx="12" cy="19" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  );
}
