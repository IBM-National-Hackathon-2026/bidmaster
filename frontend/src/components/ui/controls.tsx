import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-dark shadow-[0_6px_20px_rgba(15,27,61,0.28)] hover:shadow-[0_8px_26px_rgba(15,27,61,0.34)]",
        accent: "grad-amber text-[#3a2600] hover:brightness-105 shadow-[0_6px_20px_rgba(255,176,32,0.35)]",
        secondary: "bg-white text-[#0F1B3D] border border-slate-300 hover:bg-slate-100 hover:border-slate-400",
        ghost: "bg-transparent text-[#0F1B3D] border-[1.5px] border-[#0F1B3D] hover:bg-brand-light",
      },
      size: {
        default: "px-5 py-2.5 text-[0.95rem] min-h-11",
        sm: "px-3.5 py-2 text-sm min-h-11",
        lg: "px-7 py-3.5 text-base min-h-12",
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
  return <div className={cn("bg-white border border-[#C9DDEE] rounded-2xl p-6 shadow-[0_10px_36px_rgba(15,27,61,0.08)]", className)} {...props} />;
}

const fieldCls =
  "w-full px-3.5 py-3 border-[1.5px] border-slate-300 rounded-xl text-base bg-white text-[#0F1B3D] placeholder:text-slate-400 " +
  "transition-colors focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 " +
  "aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-100";

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
    <label className={cn("block mt-3.5 mb-1.5 font-semibold text-sm text-slate-700", className)} {...props} />
  );
}

/** Pesan validasi ringkas di bawah field. */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-red-700 mt-1 flex items-center gap-1" role="alert">⚠ {children}</p>;
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <h3 className="font-bold text-[#0F1B3D]">{children}</h3>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
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

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Placeholder baris untuk daftar/tabel yang sedang memuat. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Term({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="term" tabIndex={0} title={tip}>
      {children}
    </span>
  );
}
