"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CLASS } from "./toolConfig";

export interface ActionButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className: string;
  suppressTooltip?: boolean;
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ label, onClick, children, className, suppressTooltip }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const setRefs = useCallback((node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (!ref) return;
      if (typeof ref === "function") ref(node);
      else ref.current = node;
    }, [ref]);

    const updateAnchor = useCallback(() => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setAnchorRect(rect);
    }, []);

    useLayoutEffect(() => {
      if (!isHovered || suppressTooltip) return;
      updateAnchor();
    }, [isHovered, suppressTooltip, updateAnchor]);

    useEffect(() => {
      if (!isHovered || suppressTooltip) return;
      const handle = () => updateAnchor();
      window.addEventListener("resize", handle);
      window.addEventListener("scroll", handle, true);
      return () => {
        window.removeEventListener("resize", handle);
        window.removeEventListener("scroll", handle, true);
      };
    }, [isHovered, suppressTooltip, updateAnchor]);

    const canPortal = typeof document !== "undefined";
    const tooltipEl =
      canPortal && isHovered && !suppressTooltip && anchorRect
        ? createPortal(
            <div
              className={TOOLTIP_CLASS}
              style={{
                left: Math.round(anchorRect.right + 8),
                top: Math.round(anchorRect.top + anchorRect.height / 2),
                transform: "translateY(-50%)",
              }}
            >
              {label}
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <button
          ref={setRefs}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onClick}
          title={label}
          className={className}
        >
          {children}
        </button>
        {tooltipEl}
      </>
    );
  },
);

ActionButton.displayName = "ActionButton";
