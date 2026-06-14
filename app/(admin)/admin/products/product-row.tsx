import { type LucideIcon, Beer, Utensils, Cookie, Package, Pencil, Plus, MoreHorizontal, TriangleAlert, PackageX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { TonalBadge } from "@/components/ui/tonal-badge"
import { cn } from "@/lib/utils"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

export interface Product {
    id: string
    name: string
    category: string
    price: number
    stock: number
    active: boolean
}

export const categoryLabels: Record<string, string> = { bebidas: 'Bebidas', lanches: 'Lanches', doces: 'Doces', outros: 'Outros' }

export const categoryStyles: Record<string, { icon: LucideIcon; iconClassName: string; iconBgClassName: string; dotClassName: string }> = {
    bebidas: { icon: Beer, iconClassName: 'text-blue-600', iconBgClassName: 'bg-blue-50', dotClassName: 'bg-blue-500' },
    lanches: { icon: Utensils, iconClassName: 'text-amber-600', iconBgClassName: 'bg-amber-50', dotClassName: 'bg-amber-500' },
    doces: { icon: Cookie, iconClassName: 'text-pink-600', iconBgClassName: 'bg-pink-50', dotClassName: 'bg-pink-500' },
    outros: { icon: Package, iconClassName: 'text-slate-500', iconBgClassName: 'bg-slate-100', dotClassName: 'bg-slate-400' },
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ProductRow({ product, onEdit, onDelete, isReadOnly = false }: { product: Product; onEdit: (p: Product) => void; onDelete: (id: string) => void; isReadOnly?: boolean }) {
    const style = categoryStyles[product.category] ?? categoryStyles.outros
    const Icon = style.icon
    const outOfStock = product.stock === 0
    const lowStock = product.stock > 0 && product.stock <= 5

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex items-center gap-2.5">
                    <div className={cn("h-9 w-9 rounded-md flex items-center justify-center shrink-0", style.iconBgClassName)}>
                        <Icon className={cn("h-4 w-4", style.iconClassName)} />
                    </div>
                    <div>
                        <div className="font-medium leading-tight">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{categoryLabels[product.category] ?? product.category}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{currency.format(product.price)}</TableCell>
            <TableCell>
                {outOfStock ? (
                    <TonalBadge color="red"><PackageX className="h-3 w-3" />Esgotado</TonalBadge>
                ) : lowStock ? (
                    <TonalBadge color="amber"><TriangleAlert className="h-3 w-3" />{product.stock} un. · baixo</TonalBadge>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium tabular-nums">{product.stock}</span>
                        <span className="text-xs text-muted-foreground">un.</span>
                    </span>
                )}
            </TableCell>
            <TableCell>
                {product.active ? (
                    <TonalBadge color="emerald">Disponível</TonalBadge>
                ) : (
                    <TonalBadge color="slate">Indisponível</TonalBadge>
                )}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {outOfStock ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/30 bg-blue-50 text-primary hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity align-middle"
                        onClick={() => onEdit(product)}
                        disabled={isReadOnly}
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                    >
                        <Plus className="h-3.5 w-3.5" /> Repor
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-white opacity-0 group-hover:opacity-100 transition-opacity align-middle"
                        onClick={() => onEdit(product)}
                        disabled={isReadOnly}
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                    >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity align-middle text-muted-foreground"
                    onClick={() => onDelete(product.id)}
                    disabled={isReadOnly}
                    title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    )
}
