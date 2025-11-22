import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm shadow-blue-500/20",
                secondary:
                    "border-transparent bg-slate-500/10 text-slate-300 border-slate-500/20",
                success:
                    "border-transparent bg-green-500/10 text-green-400 border-green-500/20 shadow-sm shadow-green-500/20",
                warning:
                    "border-transparent bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-sm shadow-yellow-500/20",
                danger:
                    "border-transparent bg-red-500/10 text-red-400 border-red-500/20 shadow-sm shadow-red-500/20",
                outline: "text-slate-300 border-slate-700",
                pulse:
                    "border-transparent bg-green-500/10 text-green-400 border-green-500/20 animate-pulse shadow-lg shadow-green-500/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({ className, variant, ...props }) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
