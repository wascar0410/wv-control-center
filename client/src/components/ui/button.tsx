import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default:
          "bg-[#1D4ED8] text-white hover:bg-[#123D7A] focus-visible:ring-[#1D4ED8]/30 shadow-sm",
        destructive:
          "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]/30 shadow-sm",
        outline:
          "border border-[#E5E7EB] bg-white text-[#0B1F3A] hover:bg-[#EEF5FF] hover:border-[#123D7A] focus-visible:ring-[#1D4ED8]/20 shadow-sm",
        secondary:
          "bg-[#123D7A] text-white hover:bg-[#0B1F3A] focus-visible:ring-[#123D7A]/30 shadow-sm",
        ghost:
          "text-[#0B1F3A] hover:bg-[#EEF5FF] hover:text-[#123D7A]",
        link:
          "text-[#1D4ED8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 py-2 text-sm",
        lg: "h-11 px-6 py-3 text-sm",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
