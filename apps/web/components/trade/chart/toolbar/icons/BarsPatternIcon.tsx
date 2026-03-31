import type { IconProps } from "./iconTypes";
export function BarsPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="4" y1="6"  x2="4"  y2="16" strokeWidth="1.5"/>
                <line x1="2" y1="9"  x2="4"  y2="9"  strokeWidth="1.5"/>
                <line x1="4" y1="13" x2="6"  y2="13" strokeWidth="1.5"/>

                <line x1="8" y1="9"  x2="8"  y2="18" strokeWidth="1.5"/>
                <line x1="6" y1="11" x2="8"  y2="11" strokeWidth="1.5"/>
                <line x1="8" y1="15" x2="10" y2="15" strokeWidth="1.5"/>

                <line x1="12" y1="5"  x2="12" y2="14" strokeWidth="1.5"/>
                <line x1="10" y1="8"  x2="12" y2="8"  strokeWidth="1.5"/>
                <line x1="12" y1="12" x2="14" y2="12" strokeWidth="1.5"/>

                <line x1="14" y1="11" x2="17" y2="11" strokeDasharray="1.5 1" strokeWidth="1.2"/>
                <polyline points="16,9 18,11 16,13" strokeWidth="1.2" fill="none"/>


                <line x1="19" y1="6"  x2="19" y2="16" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="17" y1="9"  x2="19" y2="9"  strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="19" y1="13" x2="21" y2="13" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
