'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import type { CustomerReceivable } from '@/lib/repositories/receivables'
import { SettlementModal } from './settlement-modal'

// ponytail: inline BRL formatter — no helper in lib/format-helpers.ts
const brl = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// ponytail: native <details>/<summary> instead of @radix-ui/react-accordion — package not installed
function ComandaRow({ comanda }: { comanda: CustomerReceivable }) {
    const date = new Date(comanda.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })

    return (
        <details className="border-b last:border-0 group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 list-none">
                <div className="flex items-center gap-3">
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    <span className="text-sm text-muted-foreground">{date}</span>
                </div>
                <span className="font-semibold text-sm text-red-600">{brl(comanda.total)}</span>
            </summary>
            <div className="px-4 pb-3 pt-1 bg-slate-50">
                {comanda.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem itens registrados</p>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b">
                                <th className="py-1 text-left font-medium text-slate-500">Produto</th>
                                <th className="py-1 text-right font-medium text-slate-500">Qtd</th>
                                <th className="py-1 text-right font-medium text-slate-500">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comanda.items.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                    <td className="py-1">{item.name ?? '—'}</td>
                                    <td className="py-1 text-right">{item.quantity}</td>
                                    <td className="py-1 text-right">{brl(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </details>
    )
}

interface Props {
    customerProfileId: string
    comandas: CustomerReceivable[]
}

export function CustomerReceivablesClient({ customerProfileId, comandas }: Props) {
    const customerName = comandas[0]?.customerName ?? 'Cliente'
    const grandTotal = comandas.reduce((sum, c) => sum + c.total, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Link
                    href="/admin/receivables"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Contas a Receber
                </Link>
                {comandas.length > 0 && (
                    <SettlementModal
                        customerName={customerName}
                        totalAmount={grandTotal}
                        comandasCount={comandas.length}
                        customerProfileId={customerProfileId}
                    />
                )}
            </div>

            <div>
                <h1 className="text-2xl font-bold tracking-tight">{customerName}</h1>
                <p className="text-muted-foreground text-sm mt-1">Comandas em aberto</p>
            </div>

            {comandas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-muted-foreground">Nenhuma comanda a receber para este cliente</p>
                </div>
            ) : (
                <>
                    <div className="rounded-lg border bg-white overflow-hidden">
                        {comandas.map((c) => (
                            <ComandaRow key={c.id} comanda={c} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Total a receber</p>
                            <p className="text-xl font-bold text-red-600">{brl(grandTotal)}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
