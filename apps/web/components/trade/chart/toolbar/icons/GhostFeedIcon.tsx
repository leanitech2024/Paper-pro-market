import type { IconProps } from "./iconTypes";
export function GhostFeedIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="4" y1="5"  x2="4"  y2="8"  strokeDasharray="1.5 1" strokeWidth="1"/>
                <rect x="2" y="8"  width="4" height="5" rx="0.5" strokeDasharray="2 1.5" strokeWidth="1" fill="none" opacity="0.5"/>
                <line x1="4" y1="13" x2="4"  y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>

                <line x1="10" y1="4"  x2="10" y2="7"  strokeDasharray="1.5 1" strokeWidth="1"/>
                <rect x="8"  y="7"  width="4" height="6" rx="0.5" strokeDasharray="2 1.5" strokeWidth="1" fill="none" opacity="0.5"/>
                <line x1="10" y1="13" x2="10" y2="17" strokeDasharray="1.5 1" strokeWidth="1"/>

                <line x1="16" y1="6"  x2="16" y2="9"  strokeDasharray="1.5 1" strokeWidth="1"/>
                <rect x="14" y="9"  width="4" height="5" rx="0.5" strokeDasharray="2 1.5" strokeWidth="1" fill="none" opacity="0.5"/>
                <line x1="16" y1="14" x2="16" y2="18" strokeDasharray="1.5 1" strokeWidth="1"/>

                <line x1="22" y1="5"  x2="22" y2="8"  strokeDasharray="1.5 1" strokeWidth="1"/>
                <rect x="20" y="8"  width="4" height="7" rx="0.5" strokeDasharray="2 1.5" strokeWidth="1" fill="none" opacity="0.5"/>
                <line x1="22" y1="15" x2="22" y2="19" strokeDasharray="1.5 1" strokeWidth="1"/>
    </svg>
  );
}
