import { cn } from "@/lib/utils"

export type TonalColor = "blue" | "emerald" | "amber" | "red" | "slate" | "violet"

const TONE_CLASSES: Record<TonalColor, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
}

interface TonalBadgeProps {
    color: TonalColor
    children: React.ReactNode
    dot?: boolean
    className?: string
}

/** Soft tonal status badge — unifies status language across admin tables/cards/lists. */
export function TonalBadge({ color, children, dot = true, className }: TonalBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap",
                TONE_CLASSES[color],
                className
            )}
        >
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />}
            {children}
        </span>
    )
}
