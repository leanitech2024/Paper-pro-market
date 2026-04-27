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

export function CalloutIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 3 4 L 21 4 Q 22 4 22 5 L 22 14 Q 22 15 21 15 L 9 15 L 5 20 L 6 15 L 3 15 Q 2 15 2 14 L 2 5 Q 2 4 3 4 Z"/>

                <line x1="5" y1="8"  x2="19" y2="8"  strokeWidth="0.8"/>
                <line x1="5" y1="11" x2="15" y2="11" strokeWidth="0.8"/>
    </svg>
  );
}

export function CommentIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      <path d="M4 4 Q2 4 2 6.5 L2 14.5 Q2 17 4.5 17 L10 17 Q12 19 12 20 Q12 19 14 17 L19.5 17 Q22 17 22 14.5 L22 6.5 Q22 4 20 4 Z"/>
    </svg>
  );
}

export function CurveIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 3 18 C 8 18 10 4 21 6" fill="none"/>

                <circle cx="3"  cy="18" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="6"  r="1.2" fill="currentColor" stroke="none"/>

                <line x1="3"  y1="18" x2="8"  y2="18" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="21" y1="6" x2="10" y2="4" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}

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

export function DatePriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="5" y1="3" x2="5" y2="19"/>

                <polyline points="3,6 5,3 7,6"/>

                <line x1="3" y1="3" x2="7" y2="3" strokeWidth="1.5"/>

                <line x1="5" y1="19" x2="21" y2="19"/>

                <polyline points="18,17 21,19 18,21"/>

                <line x1="21" y1="17" x2="21" y2="21" strokeWidth="1.5"/>

                <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/>

                <line x1="5" y1="3" x2="21" y2="19" strokeDasharray="2 1.5" strokeWidth="0.8"/>
    </svg>
  );
}

export function DateRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="12" x2="21" y2="12"/>

                <polyline points="6,9 3,12 6,15"/>

                <polyline points="18,9 21,12 18,15"/>

                <line x1="3"  y1="8" x2="3"  y2="16" strokeWidth="1.5"/>
                <line x1="21" y1="8" x2="21" y2="16" strokeWidth="1.5"/>

                <rect x="9" y="15" width="6" height="5" rx="1" strokeWidth="1"/>
                <line x1="9"  y1="17" x2="15" y2="17" strokeWidth="0.8"/>
                <line x1="12" y1="15" x2="12" y2="20" strokeWidth="0.8"/>
    </svg>
  );
}

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

export function EllipseIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <ellipse cx="12" cy="12" rx="10" ry="5"/>
    </svg>
  );
}

export function PolylineIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="3,18 8,8 13,14 18,6 21,10"/>

                <circle cx="3"  cy="18" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="8"  cy="8"  r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="14" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="6"  r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="10" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function PriceRangeIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="12" y1="3" x2="12" y2="21"/>

                <polyline points="9,6 12,3 15,6"/>

                <polyline points="9,18 12,21 15,18"/>

                <line x1="8" y1="3"  x2="16" y2="3"  strokeWidth="1.5"/>
                <line x1="8" y1="21" x2="16" y2="21" strokeWidth="1.5"/>

                <path d="M 17 5 L 20 5 L 20 19 L 17 19" fill="none" strokeWidth="1.2"/>
    </svg>
  );
}

export function RotatedRectangleIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polygon points="5,16 8,4 19,8 16,20"/>
    </svg>
  );
}

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
