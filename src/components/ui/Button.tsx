import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_1px_2px_rgb(25_36_71/0.08),0_8px_20px_-10px_rgb(49_88_220/0.6)] hover:bg-brand-strong hover:shadow-[0_2px_4px_rgb(25_36_71/0.08),0_14px_28px_-12px_rgb(49_88_220/0.65)]",
  secondary: "border border-line-strong bg-surface text-fg hover:border-brand/40 hover:bg-brand-soft",
  ghost: "text-muted hover:bg-brand-soft hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant,
  size,
  className = "",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className = "",
  href,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}
