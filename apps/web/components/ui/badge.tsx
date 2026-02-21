import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-status-success-background text-status-success dark:bg-status-success/20",
        warning:
          "border-transparent bg-status-warning-background text-status-warning dark:bg-status-warning/20",
        pending:
          "border-transparent bg-status-info-background text-status-info dark:bg-status-info/20",
        info:
          "border-transparent bg-status-info-background text-status-info dark:bg-status-info/20",
        rejected:
          "border-transparent bg-status-error-background text-status-error dark:bg-status-error/20",
        error:
          "border-transparent bg-status-error-background text-status-error dark:bg-status-error/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }