import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-dark shadow-[0_0_20px_rgba(229,72,77,0.25)]",
        secondary: "bg-surface-2 text-ink border border-white/10 hover:bg-white/10",
        ghost: "bg-transparent text-brand border-[1.5px] border-brand hover:bg-brand-light",
      },
      size: {
        default: "px-5 py-2.5 text-sm min-h-11",
        sm: "px-3.5 py-1.5 text-[0.83rem] min-h-9",
        lg: "px-7 py-3.5 text-base min-h-12 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-surface border border-white/10 rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]", className)} {...props} />;
}

const fieldCls =
  "w-full px-3.5 py-2.5 border-[1.5px] border-white/10 rounded-lg text-base bg-night text-ink placeholder:text-slate-500 " +
  "focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20 " +
  "aria-[invalid=true]:border-red-500";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, "[color-scheme:dark]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldCls, "[&>option]:bg-surface", className)} {...props} />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block mt-3.5 mb-1 font-semibold text-[0.88rem] text-slate-300", className)} {...props} />
  );
}

export function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs border-[1.5px]",
        ok ? "border-green-500/60 text-green-300 bg-green-500/10" : "border-red-500/60 text-red-300 bg-red-500/10"
      )}
    >
      {(ok ? "✓ " : "✗ ")}
      {children}
    </span>
  );
}

export function Alert({ kind, children }: { kind: "error" | "warn" | "ok"; children: React.ReactNode }) {
  const map = {
    error: "bg-red-500/10 border-red-500/30 text-red-200",
    warn: "bg-amber-500/10 border-amber-500/30 text-amber-200",
    ok: "bg-green-500/10 border-green-500/30 text-green-200",
  } as const;
  return <div className={cn("border rounded-lg px-4 py-3 text-sm", map[kind])}>{children}</div>;
}

export function Term({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="term" tabIndex={0} title={tip}>
      {children}
    </span>
  );
}
