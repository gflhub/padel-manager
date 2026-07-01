'use client'

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, LayoutGrid, Table, Wallet, Receipt, TrendingUp, Beer } from "lucide-react"
import { createComanda } from "@/app/actions/comandas"
import { toast } from "sonner"
import { CustomerCombobox } from "@/components/customer-combobox"
import ComandasCards from "./comandas-cards"
import AdminComandasClient from "./comandas-client"
import { SummaryBar } from "@/components/summary-bar"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

interface Comanda {
    id: string
    customer_name: string
    customerProfileId: string | null
    status: string
    items_count: number
    total_amount: number
    opened_at: string
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

const isToday = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

interface Product {
    id: string
    name: string
    category: string
    price: number
}

export default function ComandasWrapper({ comandas: initialComandas, products, isReadOnly = false }: { comandas: Comanda[]; products: Product[]; isReadOnly?: boolean }) {
    const [comandas, setComandas] = useState(initialComandas)
    const [openCreate, setOpenCreate] = useState(false)

    useEffect(() => {
        setComandas(initialComandas)
    }, [initialComandas])
    const [loading, setLoading] = useState(false)
    const [createCustomerId, setCreateCustomerId] = useState<string | null>(null)
    const [createCustomerName, setCreateCustomerName] = useState('')
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

    const openComandas = comandas.filter(c => c.status === 'open')
    const closedComandas = comandas.filter(c => c.status === 'closed')
    const totalOpen = openComandas.reduce((sum, c) => sum + c.total_amount, 0)
    const closedToday = closedComandas.filter(c => isToday(c.opened_at))
    const ticketMedio = closedComandas.length > 0
        ? closedComandas.reduce((sum, c) => sum + c.total_amount, 0) / closedComandas.length
        : 0
    const itensVendidosHoje = closedToday.reduce((sum, c) => sum + c.items_count, 0)

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        setLoading(true)
        const formData = new FormData(form)
        if (createCustomerId) {
            formData.set('customer_name', createCustomerName)
            formData.set('customer_profile_id', createCustomerId)
        }
        const result = await createComanda(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Comanda aberta!')
            setOpenCreate(false)
            setCreateCustomerId(null)
            setCreateCustomerName('')
            if (result.data) setComandas(prev => [result.data as Comanda, ...prev])
            form.reset()
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Comandas</h1>
                    <p className="text-muted-foreground">Gerencie comandas dos clientes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'cards' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('cards')}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Cards
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                        >
                            <Table className="h-4 w-4 mr-2" />
                            Tabela
                        </Button>
                    </div>
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Comanda
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Abrir Comanda</DialogTitle>
                                <DialogDescription>Dados do cliente.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Cliente</Label>
                                    <CustomerCombobox
                                        value={createCustomerId}
                                        onChange={(id, name) => { setCreateCustomerId(id); setCreateCustomerName(name) }}
                                    />
                                </div>
                                {createCustomerId === null && (
                                    <div className="space-y-2">
                                        <Label htmlFor="customer_name">Nome (walk-in)</Label>
                                        <Input id="customer_name" name="customer_name" placeholder="Nome do cliente" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="customer_phone">Telefone</Label>
                                    <Input id="customer_phone" name="customer_phone" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer_cpf">CPF</Label>
                                    <Input id="customer_cpf" name="customer_cpf" />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Abrindo...' : 'Abrir Comanda'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <SummaryBar
                hero={{
                    label: "Total em Aberto",
                    value: formatCurrency(totalOpen),
                    suffix: `${openComandas.length} ativas`,
                    icon: Wallet,
                }}
                items={[
                    {
                        label: "Abertas",
                        value: String(openComandas.length),
                        icon: Receipt,
                        iconClassName: "text-emerald-600",
                        iconBgClassName: "bg-emerald-50",
                    },
                    {
                        label: "Ticket Médio",
                        value: closedComandas.length > 0 ? formatCurrency(ticketMedio) : "—",
                        suffix: closedComandas.length > 0 ? `${closedComandas.length} fechadas` : undefined,
                        icon: TrendingUp,
                        iconClassName: "text-violet-600",
                        iconBgClassName: "bg-violet-50",
                    },
                    {
                        label: "Itens Vendidos Hoje",
                        value: String(itensVendidosHoje),
                        icon: Beer,
                        iconClassName: "text-amber-600",
                        iconBgClassName: "bg-amber-50",
                    },
                ]}
            />

            {viewMode === 'cards' ? (
                <ComandasCards comandas={comandas} products={products} isReadOnly={isReadOnly} />
            ) : (
                <AdminComandasClient comandas={comandas} products={products} isReadOnly={isReadOnly} />
            )}
        </div>
    )
}
