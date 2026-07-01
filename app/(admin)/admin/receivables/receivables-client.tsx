'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import type { ReceivablesByCustomer } from '@/lib/repositories/receivables'

// ponytail: inline BRL formatter — no helper in lib/format-helpers.ts
const brl = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface Props {
    customers: ReceivablesByCustomer[]
}

export function ReceivablesClient({ customers }: Props) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return customers
        const q = search.toLowerCase()
        return customers.filter((c) => c.customerName.toLowerCase().includes(q))
    }, [customers, search])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
                    <p className="text-muted-foreground text-sm mt-1">Clientes com comandas em aberto</p>
                </div>
            </div>

            <div className="max-w-sm">
                <Input
                    placeholder="Buscar por nome do cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-muted-foreground">Nenhuma conta a receber</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </div>
            ) : (
                <div className="rounded-lg border bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                                <th className="px-4 py-3 text-right font-medium text-slate-600">Comandas</th>
                                <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c) => (
                                <tr key={c.customerProfileId} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{c.customerName}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{c.comandaCount}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-red-600">{brl(c.totalAmount)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={`/admin/receivables/${c.customerProfileId}`}
                                            className="text-primary hover:underline text-xs font-medium"
                                        >
                                            Ver detalhes
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
