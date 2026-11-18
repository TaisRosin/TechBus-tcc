// shadcn/ui button pattern (MIT), adapted to TechBus tokens.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
const buttonVariants = cva(
  "button inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "button-primary",
        outline: "button-outline",
        ghost: "button-ghost",
        destructive: "button-danger",
      },
      size: { default: "", sm: "button-small" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
