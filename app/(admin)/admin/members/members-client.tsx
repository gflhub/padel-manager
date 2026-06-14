'use client'

import { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createSubscription, markSubscriptionPaid, cancelSubscription } from "@/app/actions/subscriptions"
import { toast } from "sonner"
import { Plus, Users, CheckCircle2, AlertTriangle } from "lucide-react"
import { SummaryBar } from "@/components/summary-bar"
import { MemberRow, type Subscription } from "./member-row"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

interface ClubMember {
    id: string
    name: string
    email: string | null
}

export default function MembersClient({
    subscriptions: initialSubscriptions,
    members,
    isReadOnly = false,
}: {
    subscriptions: Subscription[]
    members: ClubMember[]
    isReadOnly?: boolean
}) {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions)
    const [openCreate, setOpenCreate] = useState(false)
    const [loading, setLoading] = useState(false)
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue'>('all')

    const metrics = useMemo(() => {
        const total = subscriptions.length
        const active = subscriptions.filter(s => s.status === 'ACTIVE').length
        const overdue = subscriptions.filter(s => s.status === 'OVERDUE').length
        const monthlyRevenue = subscriptions
            .filter(s => s.status !== 'CANCELLED')
            .reduce((sum, s) => sum + s.price, 0)
        return { total, active, overdue, monthlyRevenue }
    }, [subscriptions])

    const filtered = useMemo(() => {
        if (statusFilter === 'active') return subscriptions.filter(s => s.status === 'ACTIVE')
        if (statusFilter === 'overdue') return subscriptions.filter(s => s.status === 'OVERDUE')
        return subscriptions
    }, [subscriptions, statusFilter])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const result = await createSubscription(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Mensalista cadastrado com sucesso!')
            setOpenCreate(false)
            if (result.data) setSubscriptions(prev => [...prev, result.data as Subscription])
        }
        setLoading(false)
    }

    const handleMarkPaid = async (subscription: Subscription) => {
        const result = await markSubscriptionPaid(subscription.id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Pagamento registrado!')
            setSubscriptions(prev => prev.map(s => s.id === subscription.id ? { ...s, status: 'ACTIVE' } : s))
            // Refresh to get updated next_due_date
            window.location.reload()
        }
    }

    const handleCancel = async (subscription: Subscription) => {
        const result = await cancelSubscription(subscription.id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Mensalista cancelado.')
            setSubscriptions(prev => prev.map(s => s.id === subscription.id ? { ...s, status: 'CANCELLED' } : s))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mensalistas</h1>
                    <p className="text-muted-foreground">Gerencie os planos mensais e pagamentos recorrentes.</p>
                </div>

                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogTrigger asChild>
                        <Button disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}>
                            <Plus className="mr-2 h-4 w-4" /> Novo Mensalista
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cadastrar Mensalista</DialogTitle>
                            <DialogDescription>
                                Vincule um cliente a um plano mensal recorrente.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="member_id">Cliente <span className="text-destructive">*</span></Label>
                                <Select name="member_id" required>
                                    <SelectTrigger id="member_id" className="w-full">
                                        <SelectValue placeholder="Selecione um cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.name} {member.email ? `(${member.email})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="plan_name">Nome do Plano <span className="text-destructive">*</span></Label>
                                <Input id="plan_name" name="plan_name" placeholder="Mensalidade Quadra 1 - Terças 19h" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Valor Mensal (R$) <span className="text-destructive">*</span></Label>
                                    <Input id="price" name="price" type="number" min="0" step="0.01" placeholder="200.00" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="due_day">Dia de Vencimento <span className="text-destructive">*</span></Label>
                                    <Input id="due_day" name="due_day" type="number" min="1" max="28" placeholder="5" required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Salvando...' : 'Cadastrar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <SummaryBar
                hero={{
                    label: "Total de Mensalistas",
                    value: String(metrics.total),
                    suffix: `${metrics.active} em dia`,
                    icon: Users,
                }}
                items={[
                    {
                        label: "Em Atraso",
                        value: String(metrics.overdue),
                        icon: AlertTriangle,
                        iconClassName: "text-red-600",
                        iconBgClassName: "bg-red-50",
                    },
                    {
                        label: "Receita Mensal Recorrente",
                        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.monthlyRevenue),
                        icon: CheckCircle2,
                        iconClassName: "text-emerald-600",
                        iconBgClassName: "bg-emerald-50",
                    },
                ]}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <CardTitle>Lista de Mensalistas</CardTitle>
                        <div className="inline-flex items-center bg-muted rounded-lg p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                            >
                                Todos {metrics.total}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'active' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                            >
                                Em dia {metrics.active}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('overdue')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'overdue' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                            >
                                Em atraso {metrics.overdue}
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Próx. Cobrança</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                                        Nenhum mensalista cadastrado.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((subscription) => (
                                <MemberRow
                                    key={subscription.id}
                                    subscription={subscription}
                                    onMarkPaid={handleMarkPaid}
                                    onCancel={handleCancel}
                                    isReadOnly={isReadOnly}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
