import type { IconProps } from "./iconTypes";

export function AbcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="3,5 10,19 17,7 22,19"/>

                <circle cx="3"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="17" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="22" cy="19" r="1.2" fill="currentColor" stroke="none"/>

                <text x="1"  y="4"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">A</text>
                <text x="9"  y="23"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">B</text>
                <text x="16" y="6"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">C</text>
                <text x="21" y="23"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">D</text>

                <line x1="5.5" y1="11" x2="7.5" y2="11" strokeWidth="1" transform="rotate(-66, 6.5, 11)"/>
                <line x1="5.5" y1="13" x2="7.5" y2="13" strokeWidth="1" transform="rotate(-66, 6.5, 13)"/>
                <line x1="18.5" y1="11" x2="20.5" y2="11" strokeWidth="1" transform="rotate(66, 19.5, 11)"/>
                <line x1="18.5" y1="13" x2="20.5" y2="13" strokeWidth="1" transform="rotate(66, 19.5, 13)"/>
    </svg>
  );
}

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

export function CypherPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 7,8 11,14 16,2 21,13"/>

                <circle cx="2"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="8"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="11" cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="2"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="13" r="1.2" fill="currentColor" stroke="none"/>

                <text x="0"  y="22"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">X</text>
                <text x="6"  y="7"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">A</text>
                <text x="10" cy="19" y="20" fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">B</text>
                <text x="15" y="2"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">C</text>
                <text x="20" y="17"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">D</text>

                <line x1="2" y1="19" x2="16" y2="2" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}

export function ElliottCorrectionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="5" x2="9" y2="15"/>

                <line x1="9" y1="15" x2="14" y2="10"/>

                <line x1="14" y1="10" x2="21" y2="20"/>

                <circle cx="2"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="20" r="1.2" fill="currentColor" stroke="none"/>

                <text x="4"  y="9"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">A</text>
                <text x="10" y="11"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">B</text>
                <text x="16" y="14"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">C</text>
    </svg>
  );
}

export function ElliottDoubleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2"  y1="6"  x2="6"  y2="14"/>
                <line x1="6"  y1="14" x2="9"  y2="10"/>

                <line x1="9"  y1="10" x2="13" y2="14"/>

                <line x1="13" y1="14" x2="17" y2="20"/>
                <line x1="17" y1="20" x2="21" y2="16"/>

                <circle cx="2"  cy="6"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="13" cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="16" r="1.2" fill="currentColor" stroke="none"/>

                <text x="3"  y="5"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">W</text>
                <text x="10" y="9"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">X</text>
                <text x="15" y="13"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="700">Y</text>

                <line x1="9"  y1="6" x2="9"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.8"/>
                <line x1="13" y1="6" x2="13" y2="22" strokeDasharray="1.5 1" strokeWidth="0.8"/>
    </svg>
  );
}

export function ElliottImpulseIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="20" x2="6" y2="13"/>

                <line x1="6" y1="13" x2="9" y2="16"/>

                <line x1="9" y1="16" x2="14" y2="7"/>

                <line x1="14" y1="7" x2="17" y2="10"/>

                <line x1="17" y1="10" x2="21" y2="4"/>

                <circle cx="2"  cy="20" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="16" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14" cy="7"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="17" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="4"  r="1.2" fill="currentColor" stroke="none"/>

                <text x="3.5" y="12"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">1</text>
                <text x="7"   y="20"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">2</text>
                <text x="11"  y="9"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">3</text>
                <text x="15"  y="14"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">4</text>
                <text x="19"  y="6"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">5</text>
    </svg>
  );
}

export function ElliottTriangleIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="5" x2="7" y2="17"/>

                <line x1="7" y1="17" x2="12" y2="8"/>

                <line x1="12" y1="8" x2="16" y2="15"/>

                <line x1="16" y1="15" x2="19" y2="10"/>

                <line x1="19" y1="10" x2="22" y2="13"/>

                <line x1="2" y1="5" x2="22" y2="10" strokeDasharray="2 1.5" strokeWidth="0.8"/>

                <line x1="7" y1="17" x2="22" y2="13" strokeDasharray="2 1.5" strokeWidth="0.8"/>

                <circle cx="2"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="17" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="8"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="19" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="22" cy="13" r="1.2" fill="currentColor" stroke="none"/>

                <text x="1"  y="4"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">A</text>
                <text x="6"  y="22"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">B</text>
                <text x="11" y="7"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">C</text>
                <text x="15" y="20"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">D</text>
                <text x="19" y="9"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">E</text>
    </svg>
  );
}

export function ElliottTripleComboIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2"  y1="5"  x2="5"  y2="12"/>
                <line x1="5"  y1="12" x2="7"  y2="9"/>

                <line x1="7"  y1="9"  x2="9"  y2="12"/>

                <line x1="9"  y1="12" x2="12" y2="17"/>
                <line x1="12" y1="17" x2="14" y2="13"/>

                <line x1="14" y1="13" x2="16" y2="16"/>

                <line x1="16" y1="16" x2="19" y2="20"/>
                <line x1="19" y1="20" x2="22" y2="17"/>

                <circle cx="2"  cy="5"  r="1"   fill="currentColor" stroke="none"/>
                <circle cx="7"  cy="9"  r="1"   fill="currentColor" stroke="none"/>
                <circle cx="9"  cy="12" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="14" cy="13" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="16" cy="16" r="1"   fill="currentColor" stroke="none"/>
                <circle cx="22" cy="17" r="1"   fill="currentColor" stroke="none"/>

                <text x="2"  y="4"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">W</text>
                <text x="7"  y="8"   fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">X</text>
                <text x="10" y="11"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">Y</text>
                <text x="14" y="12"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">X</text>
                <text x="17" y="15"  fontSize="3.5" fill="currentColor" fontFamily="sans-serif" fontWeight="700">Z</text>

                <line x1="7"  y1="4" x2="7"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="9"  y1="4" x2="9"  y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="14" y1="4" x2="14" y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
                <line x1="16" y1="4" x2="16" y2="22" strokeDasharray="1.5 1" strokeWidth="0.7"/>
    </svg>
  );
}

export function FibChannelIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="19" x2="19" y2="3"/>
                <line x1="7" y1="21" x2="21" y2="7"/>

                <line x1="4" y1="21" x2="21" y2="4.5" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="5.5" y1="21" x2="21" y2="5.5" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="4" y1="18" x2="18" y2="5" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}

export function FibCirclesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="12" cy="12" r="2.5"/>
                <circle cx="12" cy="12" r="5.5"/>
                <circle cx="12" cy="12" r="9"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function FibExtensionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="18" y2="6"/>

                <line x1="3" y1="21" x2="18" y2="21" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="15" x2="18" y2="15" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="10" x2="18" y2="10" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="6"  x2="18" y2="6"  strokeDasharray="1.5 1.5" strokeWidth="1"/>

                <line x1="3" y1="3"  x2="21" y2="3"  strokeWidth="1.2"/>
                <line x1="3" y1="1"  x2="21" y2="1"  strokeWidth="1.2"/>

                <polyline points="19,5 21,3 19,1" strokeWidth="1.2"/>
    </svg>
  );
}

export function FibRetracementIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="3" y1="21" x2="21" y2="3"/>

                <line x1="3" y1="21" x2="21" y2="21" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="17" x2="21" y2="17" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="13" x2="21" y2="13" strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="9"  x2="21" y2="9"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="5"  x2="21" y2="5"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
                <line x1="3" y1="3"  x2="21" y2="3"  strokeDasharray="1.5 1.5" strokeWidth="1"/>
    </svg>
  );
}

export function FibSpeedArcsIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>

                <path d="M 3 15 Q 6 15 9 21" fill="none"/>

                <path d="M 3 11 Q 9 11 14 21" fill="none"/>

                <path d="M 3 7 Q 12 7 19 21" fill="none"/>

                <path d="M 3 3 Q 15 3 22 21" fill="none"/>
    </svg>
  );
}

export function FibSpeedFanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>

                <line x1="3" y1="21" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="21" y2="8"/>
                <line x1="3" y1="21" x2="21" y2="13"/>
                <line x1="3" y1="21" x2="21" y2="17"/>
                <line x1="3" y1="21" x2="21" y2="21"/>
    </svg>
  );
}

export function FibSpiralIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <path d="M 12 12 Q 14 12 14 10" fill="none"/>

                <path d="M 14 10 Q 14 7 11 7" fill="none"/>

                <path d="M 11 7 Q 6 7 6 12" fill="none"/>

                <path d="M 6 12 Q 6 18 13 18" fill="none"/>

                <path d="M 13 18 Q 21 18 21 10" fill="none"/>

                <path d="M 21 10 Q 21 3 12 3" fill="none"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export function FibTimeExtensionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <line x1="2" y1="13" x2="22" y2="13" strokeWidth="1"/>

                <line x1="2" y1="8" x2="10" y2="8" strokeWidth="1.5"/>

                <line x1="2"  y1="6" x2="2"  y2="10" strokeWidth="1.5"/>
                <line x1="10" y1="6" x2="10" y2="10" strokeWidth="1.5"/>

                <line x1="14" y1="10" x2="14" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>
                <line x1="18" y1="10" x2="18" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>
                <line x1="22" y1="10" x2="22" y2="16" strokeDasharray="1.5 1" strokeWidth="1"/>

                <polyline points="20,13 22,13" strokeWidth="1.5"/>
                <polyline points="20,11 22,13 20,15" strokeWidth="1.2"/>
    </svg>
  );
}

export function FibTimeZoneIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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

                <line x1="3"  y1="5" x2="3"  y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="6"  y1="5" x2="6"  y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="10" y1="5" x2="10" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="15" y1="5" x2="15" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
                <line x1="21" y1="5" x2="21" y2="20" strokeDasharray="2 1.5" strokeWidth="1"/>
    </svg>
  );
}

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

export function GannFanIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <circle cx="3" cy="21" r="1" fill="currentColor" stroke="none"/>

                <line x1="3" y1="21" x2="21" y2="3" strokeWidth="2"/>

                <line x1="3" y1="21" x2="21" y2="9"/>

                <line x1="3" y1="21" x2="21" y2="13"/>

                <line x1="3" y1="21" x2="21" y2="17"/>

                <line x1="3" y1="21" x2="21" y2="20"/>

                <line x1="3" y1="21" x2="9"  y2="3"/>

                <line x1="3" y1="21" x2="6"  y2="3"/>
    </svg>
  );
}

export function GannSquareFixedIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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

                <line x1="3"  y1="3"  x2="6"  y2="3"  strokeWidth="2"/>
                <line x1="3"  y1="3"  x2="3"  y2="6"  strokeWidth="2"/>
                <line x1="21" y1="3"  x2="18" y2="3"  strokeWidth="2"/>
                <line x1="21" y1="3"  x2="21" y2="6"  strokeWidth="2"/>
                <line x1="3"  y1="21" x2="6"  y2="21" strokeWidth="2"/>
                <line x1="3"  y1="21" x2="3"  y2="18" strokeWidth="2"/>
                <line x1="21" y1="21" x2="18" y2="21" strokeWidth="2"/>
                <line x1="21" y1="21" x2="21" y2="18" strokeWidth="2"/>
    </svg>
  );
}

export function GannSquareIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <rect x="10" y="10" width="4"  height="4"  rx="0.5"/>

                <rect x="7"  y="7"  width="10" height="10" rx="0.5"/>

                <rect x="4"  y="4"  width="16" height="16" rx="0.5"/>

                <rect x="2"  y="2"  width="20" height="20" rx="0.5"/>

                <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>

                <path d="M 12 12 L 14 12 L 14 8 L 8 8 L 8 15 L 15 15" fill="none" strokeWidth="1" strokeDasharray="1.5 1"/>
    </svg>
  );
}

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


export function LongPositionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      {/* Top Green Box */}
      <rect
        x="3"
        y="3"
        width="16"
        height="7"
        rx="1"
        fill="#1D9E75"
        fillOpacity="0.25"
        stroke="#1D9E75"
        strokeWidth="1.2"
      />

      {/* Divider */}
      <line x1="3" y1="13" x2="19" y2="13" />

      {/* Bottom Red Box */}
      <rect
        x="3"
        y="14"
        width="16"
        height="7"
        rx="1"
        fill="#E24B4A"
        fillOpacity="0.25"
        stroke="#E24B4A"
        strokeWidth="1.2"
      />

      {/* Up Arrow */}
      <polyline points="18,8 20,6 22,8" />
      <line x1="20" y1="6" x2="20" y2="12" />
    </svg>
  );
}


export function ShortPositionIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
      {/* Top Red Box */}
      <rect
        x="3"
        y="3"
        width="16"
        height="7"
        rx="1"
        fill="#E24B4A"
        fillOpacity="0.25"
        stroke="#E24B4A"
        strokeWidth="1.2"
      />

      {/* Divider */}
      <line x1="3" y1="13" x2="19" y2="13" />

      {/* Bottom Green Box */}
      <rect
        x="3"
        y="14"
        width="16"
        height="7"
        rx="1"
        fill="#1D9E75"
        fillOpacity="0.25"
        stroke="#1D9E75"
        strokeWidth="1.2"
      />

      {/* Down Arrow */}
      <polyline points="18,16 20,18 22,16" />
      <line x1="20" y1="12" x2="20" y2="18" />
    </svg>
  );
}

export function ThreeDrivesIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 5,14 7,17"/>

                <polyline points="7,17 11,10 13,14"/>

                <polyline points="13,14 18,5 21,9"/>

                <circle cx="5"  cy="14" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="11" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="18" cy="5"  r="1.2" fill="currentColor" stroke="none"/>

                <text x="4"  y="13" fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">1</text>
                <text x="10" y="9"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">2</text>
                <text x="17" y="4"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">3</text>
    </svg>
  );
}

export function XabcdPatternIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
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
                <polyline points="2,19 6,5 10,15 15,4 20,12"/>

                <circle cx="2"  cy="19" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="6"  cy="5"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="4"  r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none"/>

                <text x="0"  y="22"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">X</text>
                <text x="5"  y="4"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">A</text>
                <text x="9"  y="21"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">B</text>
                <text x="14" y="3"   fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">C</text>
                <text x="19" y="16"  fontSize="4" fill="currentColor" fontFamily="sans-serif" fontWeight="600">D</text>
    </svg>
  );
}
