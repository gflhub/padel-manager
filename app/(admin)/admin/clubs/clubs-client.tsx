'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TonalBadge } from "@/components/ui/tonal-badge"
import { Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { SummaryBar } from "@/components/summary-bar"
import type { ClubOverview } from "@/lib/repositories/clubs"

const STATUS_LABELS: Record<ClubOverview['trial_status'], string> = {
    active: 'Ativo',
    warning: 'Teste expirando',
    expired: 'Teste expirado',
    none: 'Sem teste',
}

function StatusBadge({ status }: { status: ClubOverview['trial_status'] }) {
    if (status === 'active') return <TonalBadge color="emerald">{STATUS_LABELS[status]}</TonalBadge>
    if (status === 'warning') return <TonalBadge color="amber">{STATUS_LABELS[status]}</TonalBadge>
    if (status === 'expired') return <TonalBadge color="red">{STATUS_LABELS[status]}</TonalBadge>
    return <TonalBadge color="slate">{STATUS_LABELS[status]}</TonalBadge>
}

function formatDate(value: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function ClubsClient({ clubs }: { clubs: ClubOverview[] }) {
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'expired'>('all')

    const metrics = useMemo(() => {
        const total = clubs.length
        const active = clubs.filter(c => c.trial_status === 'active' || c.trial_status === 'none').length
        const warning = clubs.filter(c => c.trial_status === 'warning').length
        const expired = clubs.filter(c => c.trial_status === 'expired').length
        return { total, active, warning, expired }
    }, [clubs])

    const filtered = useMemo(() => {
        if (statusFilter === 'all') return clubs
        return clubs.filter(c => c.trial_status === statusFilter)
    }, [clubs, statusFilter])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Clubes</h1>
                <p className="text-muted-foreground">Visão geral dos clubes cadastrados na plataforma.</p>
            </div>

            <SummaryBar
                hero={{
                    label: "Total de Clubes",
                    value: String(metrics.total),
                    icon: Building2,
                }}
                items={[
                    {
                        label: "Ativos",
                        value: String(metrics.active),
                        icon: CheckCircle2,
                        iconClassName: "text-emerald-600",
                        iconBgClassName: "bg-emerald-50",
                    },
                    {
                        label: "Teste Expirando",
                        value: String(metrics.warning),
                        icon: Clock,
                        iconClassName: "text-amber-600",
                        iconBgClassName: "bg-amber-50",
                    },
                    {
                        label: "Teste Expirado",
                        value: String(metrics.expired),
                        icon: AlertTriangle,
                        iconClassName: "text-red-600",
                        iconBgClassName: "bg-red-50",
                    },
                ]}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <CardTitle>Lista de Clubes</CardTitle>
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
                                onClick={() => setStatusFilter('warning')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'warning' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                            >
                                Expirando {metrics.warning}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('expired')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'expired' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                            >
                                Expirados {metrics.expired}
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Clube</TableHead>
                                <TableHead>Equipe</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Fim do Teste</TableHead>
                                <TableHead>Cadastro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                        Nenhum clube encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((club) => (
                                <TableRow key={club.id}>
                                    <TableCell className="font-medium">{club.name}</TableCell>
                                    <TableCell className="text-sm">{club.staff_count}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={club.trial_status} />
                                        {club.trial_status === 'warning' && club.trial_days_remaining !== null && (
                                            <span className="ml-2 text-xs text-muted-foreground">{club.trial_days_remaining}d restantes</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(club.trial_ends_at)}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(club.created_at)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
