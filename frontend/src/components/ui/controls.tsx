import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-dark shadow-[0_4px_16px_rgba(15,27,61,0.25)]",
        secondary: "bg-white text-[#0F1B3D] border border-slate-300 hover:bg-slate-100",
        ghost: "bg-transparent text-[#0F1B3D] border-[1.5px] border-[#0F1B3D] hover:bg-brand-light",
      },
      size: {
        default: "px-5 py-2.5 text-sm min-h-11",
        sm: "px-3.5 py-2 text-[0.83rem] min-h-11",
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
  return <div className={cn("bg-white border border-[#C9DDEE] rounded-2xl p-6 shadow-[0_10px_36px_rgba(15,27,61,0.10)]", className)} {...props} />;
}

const fieldCls =
  "w-full px-3.5 py-2.5 border-[1.5px] border-slate-300 rounded-lg text-base bg-white text-[#0F1B3D] placeholder:text-slate-500 " +
  "focus:border-[#0F1B3D] focus:outline-none focus:ring-3 focus:ring-[#0F1B3D]/15 " +
  "aria-[invalid=true]:border-red-600";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, "[color-scheme:light]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldCls, className)} {...props} />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block mt-3.5 mb-1 font-semibold text-[0.88rem] text-slate-700", className)} {...props} />
  );
}

export function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs border-[1.5px]",
        ok ? "border-green-600 text-green-800 bg-green-50" : "border-red-600 text-red-800 bg-red-50"
      )}
    >
      {(ok ? "✓ " : "✗ ")}
      {children}
    </span>
  );
}

export function Alert({ kind, children }: { kind: "error" | "warn" | "ok"; children: React.ReactNode }) {
  const map = {
    error: "bg-red-50 border-red-200 text-red-800",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    ok: "bg-green-50 border-green-200 text-green-800",
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
