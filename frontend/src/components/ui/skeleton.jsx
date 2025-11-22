import { cn } from "../../lib/utils"

function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 bg-[length:200%_100%] shimmer",
                className
            )}
            {...props}
        />
    )
}

export { Skeleton }
