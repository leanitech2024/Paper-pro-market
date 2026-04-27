import type { IconProps } from "./iconTypes";
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
