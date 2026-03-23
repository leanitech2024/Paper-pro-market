"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  className?: string;
  activeClassName?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  (
    { to, className, activeClassName, children, onClick, ...props },
    ref
  ) => {
    const pathname = usePathname();

    // exact match (you can later extend this if needed)
    const isActive = pathname === to;

    return (
      <Link
        href={to}
        ref={ref}
        className={cn(className, isActive && activeClassName)}
        onClick={onClick}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };