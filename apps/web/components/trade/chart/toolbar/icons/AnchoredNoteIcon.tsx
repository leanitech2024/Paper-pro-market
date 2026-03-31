import type { IconProps } from "./iconTypes";
export function AnchoredNoteIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <rect x="4" y="5" width="16" height="13" rx="2"/>

                <line x1="7" y1="10" x2="17" y2="10" strokeWidth="1"/>
                <line x1="7" y1="13" x2="14" y2="13" strokeWidth="1"/>

                <circle cx="6" cy="6" r="2.5" fill="currentColor" stroke="none" opacity="0.15"/>
                <circle cx="6" cy="6" r="1.5" fill="none" strokeWidth="1.2"/>
                <circle cx="6" cy="6" r="0.6" fill="currentColor" stroke="none"/>

                <line x1="6" y1="7.5" x2="6" y2="9" strokeWidth="1.2"/>
    </svg>
  );
}
