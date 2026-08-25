import * as React from "react";
import { cn } from "@/utils";

// One look for every form control in the app — text, date, textarea and select alike.
const controlClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(controlClass, "h-9", className)}
      {...props}
    />
  ),
);

Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(controlClass, "resize-none", className)}
    {...props}
  />
));

Textarea.displayName = "Textarea";

// Native <select> popups don't inherit our custom properties the way the closed control does —
// `scheme-light-dark` is what keeps the option list readable in dark mode.
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(controlClass, "h-9 scheme-light-dark", className)}
    {...props}
  />
));

Select.displayName = "Select";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-muted-foreground">
      {label}
    </span>
    {children}
  </label>
);

export { Field, Input, Select, Textarea };
