import type { IconProps } from "./iconTypes";

export function DisjointChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="14" x2="21" y2="3"/>

                <line x1="3" y1="21" x2="21" y2="15"/>

                <line x1="12" y1="8.5"  x2="12" y2="18" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="6"  y1="11.5" x2="6"  y2="19.5" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="18" y1="5.5"  x2="18" y2="16"   strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}

export function InsidePitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <line x1="4" y1="20" x2="20" y2="6"/>

                <line x1="4" y1="20" x2="20" y2="2" strokeWidth="0.8" strokeDasharray="2 1.5"/>

                <line x1="4" y1="20" x2="20" y2="10" strokeWidth="0.8" strokeDasharray="2 1.5"/>

                <line x1="12" y1="13" x2="20" y2="5"/>

                <line x1="12" y1="13" x2="20" y2="7"/>

                <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function ModifiedSchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="6" y1="12" x2="10" y2="16" strokeWidth="1.2"/>
                <line x1="10" y1="12" x2="6" y2="16" strokeWidth="1.2"/>

                <line x1="8" y1="14" x2="20" y2="5"/>

                <line x1="14" y1="9.5" x2="20" y2="7"/>

                <line x1="14" y1="9.5" x2="20" y2="12"/>

                <line x1="4" y1="20" x2="12" y2="8" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}

export function PitchfanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="10" y2="10"/>

                <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/>

                <line x1="10" y1="10" x2="21" y2="3"/>
                <line x1="10" y1="10" x2="21" y2="8"/>
                <line x1="10" y1="10" x2="21" y2="13"/>
                <line x1="10" y1="10" x2="21" y2="18"/>

                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function PitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="4" y1="20" x2="20" y2="4"/>

                <line x1="12" y1="12" x2="20" y2="8"/>

                <line x1="12" y1="12" x2="20" y2="16"/>

                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function RegressionTrendIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="20" x2="21" y2="4" strokeWidth="1.8"/>

                <circle cx="4"  cy="17" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="8"  cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="9"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="20" cy="5"  r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function SchiffPitchforkIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="6" y1="14" x2="10" y2="14" strokeWidth="1.5"/>

                <line x1="8" y1="14" x2="20" y2="4"/>

                <line x1="14" y1="9" x2="20" y2="6"/>

                <line x1="14" y1="9" x2="20" y2="12"/>

                <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none"/>

                <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>

                <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>

                <line x1="4" y1="20" x2="12" y2="8" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}
