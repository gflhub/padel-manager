'use client'

import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import type { ComandaItem, Product } from "./comanda-card"

const CATEGORY_LABELS: Record<string, string> = {
    bebidas: 'Bebida',
    lanches: 'Lanche',
    doces: 'Doce',
    outros: 'Outro',
}

const CATEGORY_DOT_COLORS: Record<string, string> = {
    bebidas: 'bg-blue-500',
    lanches: 'bg-amber-500',
    doces: 'bg-violet-500',
    outros: 'bg-slate-400',
}

interface ComandaItemRowProps {
    item: ComandaItem
    products: Product[]
    onQuantityChange: (itemId: string, delta: number) => void
    formatCurrency: (value: number) => string
}

/** Single item row inside a comanda card: category dot, name/price, stepper, line total. */
export function ComandaItemRow({ item, products, onQuantityChange, formatCurrency }: ComandaItemRowProps) {
    const product = item.product_details?.product_id
        ? products.find(p => p.id === item.product_details?.product_id)
        : undefined
    const category = product?.category
    const categoryLabel = category ? (CATEGORY_LABELS[category] ?? category) : null
    const dotColor = category ? (CATEGORY_DOT_COLORS[category] ?? 'bg-slate-400') : 'bg-slate-300'

    return (
        <div className="flex items-center gap-2.5 px-1 py-2 rounded-md hover:bg-muted/70 transition-colors text-sm">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-[13px]">
                    {item.product_details?.product_name || item.item_type}
                </div>
                <div className="text-[11px] text-muted-foreground">
                    {categoryLabel ? `${categoryLabel} · ` : ''}{formatCurrency(item.unit_price || 0)} un.
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6"
                    onClick={() => onQuantityChange(item.id, -1)}
                    disabled={item.quantity <= 1}
                >
                    <Minus className="h-3 w-3" />
                </Button>
                <span className="w-5 text-center text-xs font-semibold">
                    {item.quantity}
                </span>
                <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6"
                    onClick={() => onQuantityChange(item.id, 1)}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>
            <div className="font-bold text-[13px] w-[62px] text-right">
                {formatCurrency(item.total_price)}
            </div>
        </div>
    )
}
