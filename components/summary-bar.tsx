import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SummaryBarHero {
    label: string
    value: string
    suffix?: string
    icon: LucideIcon
}

export interface SummaryBarItem {
    label: string
    value: string
    suffix?: string
    suffixClassName?: string
    icon: LucideIcon
    iconClassName?: string
    iconBgClassName?: string
}

interface SummaryBarProps {
    hero: SummaryBarHero
    items: SummaryBarItem[]
    className?: string
}

/**
 * Single-row summary strip: hero metric (filled primary) + inline stats separated by dividers.
 * Reused across admin list pages (Dashboard, Comandas, Reservas, Clientes, Produtos).
 */
export function SummaryBar({ hero, items, className }: SummaryBarProps) {
    const HeroIcon = hero.icon

    return (
        <div className={cn("rounded-lg border bg-card shadow-sm flex items-stretch overflow-x-auto", className)}>
            <div className="relative flex items-center gap-2.5 bg-primary text-primary-foreground overflow-hidden shrink-0 pl-[18px] pr-[22px]">
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)',
                        backgroundSize: '22px 22px',
                    }}
                />
                <div className="relative h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <HeroIcon className="h-4 w-4 text-white" />
                </div>
                <div className="relative leading-tight py-2.5">
                    <div className="text-[11px] text-white/80 font-medium">{hero.label}</div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold tracking-tight" style={{ fontFeatureSettings: '"tnum"' }}>
                            {hero.value}
                        </span>
                        {hero.suffix && <span className="text-[11px] font-semibold text-white/90">{hero.suffix}</span>}
                    </div>
                </div>
            </div>

            {items.map((item, i) => {
                const Icon = item.icon
                return (
                    <div key={item.label} className="flex items-center">
                        {i > 0 && <div className="w-px self-stretch bg-border my-2.5" />}
                        <div className="flex items-center gap-2.5 px-5 min-w-0">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", item.iconBgClassName ?? "bg-muted")}>
                                <Icon className={cn("h-4 w-4", item.iconClassName ?? "text-muted-foreground")} />
                            </div>
                            <div className="leading-tight whitespace-nowrap">
                                <div className="text-[11px] text-muted-foreground font-medium">{item.label}</div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold" style={{ fontFeatureSettings: '"tnum"' }}>
                                        {item.value}
                                    </span>
                                    {item.suffix && (
                                        <span className={cn("text-[11px] font-semibold", item.suffixClassName ?? "text-muted-foreground")}>
                                            {item.suffix}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
