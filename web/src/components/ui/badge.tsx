import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-cyan-400/15 text-cyan-300",
        secondary: "border-white/10 bg-white/5 text-foreground/80",
        outline: "border-white/15 text-foreground/70",
        success: "border-transparent bg-emerald-400/15 text-emerald-300",
        muted: "border-white/10 bg-white/[0.03] text-foreground/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
