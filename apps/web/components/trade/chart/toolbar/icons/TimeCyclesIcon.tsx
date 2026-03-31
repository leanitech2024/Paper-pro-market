import type { IconProps } from "./iconTypes";
export function TimeCyclesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 3 14 A 9 9 0 0 1 21 14" fill="none" strokeWidth="1.5"/>

                <line x1="3" y1="14" x2="21" y2="14" strokeWidth="1.2"/>


                <line x1="3"  y1="14" x2="4.5" y2="14" strokeWidth="1.5"/>

                <line x1="5.2"  y1="9.5"  x2="6.1"  y2="11.1" strokeWidth="1.2"/>

                <line x1="9.5"  y1="6.2"  x2="10.3" y2="7.9"  strokeWidth="1.2"/>

                <line x1="12" y1="5"   x2="12"  y2="7"   strokeWidth="1.5"/>

                <line x1="13.7" y1="7.9"  x2="14.5" y2="6.2"  strokeWidth="1.2"/>

                <line x1="17.9" y1="11.1" x2="18.8" y2="9.5"  strokeWidth="1.2"/>

                <line x1="19.5" y1="14" x2="21" y2="14" strokeWidth="1.5"/>

                <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none"/>

                <polyline points="3,12 3,16" strokeWidth="1"/>
                <polyline points="21,12 21,16" strokeWidth="1"/>
    </svg>
  );
}
