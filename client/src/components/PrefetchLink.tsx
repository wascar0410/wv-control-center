"use client";

import React, { useRef } from "react";
import { Link } from "wouter";
import { usePrefetch } from "@/lib/prefetch";

interface PrefetchLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  chunkUrls?: string[];
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
  prefetchOnFocus?: boolean;
  prefetchDelay?: number;
}

/**
 * PrefetchLink component that prefetches chunks on user interaction
 *
 * Usage:
 * <PrefetchLink
 *   href="/dashboard"
 *   chunkUrls={["/assets/ProjectionsCard-*.js"]}
 *   prefetchOnHover
 * >
 *   Dashboard
 * </PrefetchLink>
 */
export const PrefetchLink = React.forwardRef<
  HTMLAnchorElement,
  PrefetchLinkProps
>(
  (
    {
      href,
      children,
      chunkUrls = [],
      prefetchOnHover = true,
      prefetchOnVisible = true,
      prefetchOnFocus = true,
      prefetchDelay = 500,
      className,
      ...props
    },
    ref
  ) => {
    const linkRef = useRef<HTMLAnchorElement>(null);
    const mergedRef = ref || linkRef;

    // Use prefetch hook
    usePrefetch(
      mergedRef as React.RefObject<HTMLElement>,
      chunkUrls,
      {
        onHover: prefetchOnHover,
        onVisible: prefetchOnVisible,
        onFocus: prefetchOnFocus,
        delay: prefetchDelay,
      }
    );

    return (
      <Link href={href}>
        <a
          ref={mergedRef as React.Ref<HTMLAnchorElement>}
          className={className}
          {...props}
        >
          {children}
        </a>
      </Link>
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";

/**
 * PrefetchButton component that prefetches chunks on user interaction
 *
 * Usage:
 * <PrefetchButton
 *   onClick={() => navigate("/dashboard")}
 *   chunkUrls={["/assets/ProjectionsCard-*.js"]}
 *   prefetchOnHover
 * >
 *   Go to Dashboard
 * </PrefetchButton>
 */
interface PrefetchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  chunkUrls?: string[];
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
  prefetchOnFocus?: boolean;
  prefetchDelay?: number;
}

export const PrefetchButton = React.forwardRef<
  HTMLButtonElement,
  PrefetchButtonProps
>(
  (
    {
      children,
      chunkUrls = [],
      prefetchOnHover = true,
      prefetchOnVisible = false,
      prefetchOnFocus = true,
      prefetchDelay = 500,
      className,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const mergedRef = ref || buttonRef;

    // Use prefetch hook
    usePrefetch(
      mergedRef as React.RefObject<HTMLElement>,
      chunkUrls,
      {
        onHover: prefetchOnHover,
        onVisible: prefetchOnVisible,
        onFocus: prefetchOnFocus,
        delay: prefetchDelay,
      }
    );

    return (
      <button
        ref={mergedRef as React.Ref<HTMLButtonElement>}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PrefetchButton.displayName = "PrefetchButton";

/**
 * PrefetchDiv component that prefetches chunks when element becomes visible
 *
 * Usage:
 * <PrefetchDiv
 *   chunkUrls={["/assets/ProjectionsCard-*.js"]}
 *   prefetchOnVisible
 * >
 *   <ProjectionsCard />
 * </PrefetchDiv>
 */
interface PrefetchDivProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  chunkUrls?: string[];
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
  prefetchOnFocus?: boolean;
  prefetchDelay?: number;
}

export const PrefetchDiv = React.forwardRef<HTMLDivElement, PrefetchDivProps>(
  (
    {
      children,
      chunkUrls = [],
      prefetchOnHover = false,
      prefetchOnVisible = true,
      prefetchOnFocus = false,
      prefetchDelay = 500,
      className,
      ...props
    },
    ref
  ) => {
    const divRef = useRef<HTMLDivElement>(null);
    const mergedRef = ref || divRef;

    // Use prefetch hook
    usePrefetch(
      mergedRef as React.RefObject<HTMLElement>,
      chunkUrls,
      {
        onHover: prefetchOnHover,
        onVisible: prefetchOnVisible,
        onFocus: prefetchOnFocus,
        delay: prefetchDelay,
      }
    );

    return (
      <div ref={mergedRef as React.Ref<HTMLDivElement>} className={className} {...props}>
        {children}
      </div>
    );
  }
);

PrefetchDiv.displayName = "PrefetchDiv";
