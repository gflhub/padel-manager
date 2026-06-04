import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, Activity, ShoppingCart } from "lucide-react"
import { prisma } from '@/lib/db/prisma'
import { getClubContext } from '@/lib/get-club-role'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const statusLabels: Record<string, string> = {
    CONFIRMED: 'Confirmada', PENDING: 'Pendente', COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
}
const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'PENDING') return 'default'
    if (s === 'COMPLETED') return 'secondary'
    if (s === 'CANCELLED') return 'destructive'
    return 'outline'
}

export default async function AdminDashboard() {
    // TODO: Get userId from session/middleware
    const userId = null
    const ctx = userId ? await getClubContext(userId) : null
    const clubId = ctx?.clubId

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(today)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    const firstOfMonth = new Date(today)
    firstOfMonth.setDate(1)

    // Fetch data in parallel
    const [
        reservationsMes,
        reservationsToday,
        comandasAbertas,
        recentes
    ] = await Promise.all([
        clubId ? prisma.reservation.count({
            where: {
                court: { clubId },
                date: { gte: firstOfMonth },
                status: { not: 'CANCELLED' }
            }
        }) : Promise.resolve(0),
        clubId ? prisma.reservation.count({
            where: {
                court: { clubId },
                date: { gte: today, lt: tomorrowStart },
                status: { in: ['CONFIRMED', 'PENDING'] }
            }
        }) : Promise.resolve(0),
        clubId ? prisma.comanda.count({
            where: {
                clubId,
                status: 'OPEN'
            }
        }) : Promise.resolve(0),
        clubId ? prisma.reservation.findMany({
            where: {
                court: { clubId }
            },
            include: {
                court: { select: { name: true } }, profile: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 8
        }) : Promise.resolve([])
    ])

    const totalReservasMes = reservationsMes ?? 0
    const totalHoje = reservationsToday ?? 0
    const comandasAbertasCount = comandasAbertas ?? 0

    // TODO: Calculate revenue from comandas and reservations
    const receitaComandas = 0
    const receitaReservas = 0
    const receitaTotal = receitaComandas + receitaReservas

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral do seu complexo esportivo.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total (Mês)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fmt(receitaTotal)}</div>
                        <p className="text-xs text-muted-foreground">
                            Reservas + Comandas fechadas
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reservas no Mês</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReservasMes}</div>
                        <p className="text-xs text-muted-foreground">Confirmadas e concluídas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reservas Hoje</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHoje}</div>
                        <p className="text-xs text-muted-foreground">Confirmadas + check-in</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comandas Abertas</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{comandasAbertasCount}</div>
                        <p className="text-xs text-muted-foreground">Aguardando fechamento</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Reservas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentes.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma reserva encontrada.</p>
                        ) : (
                            <div className="space-y-4">
                                {recentes.map(r => {
                                    return (
                                        <div key={r.id} className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">{r.profile?.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {r.court?.name ?? '—'} · {r.date.toISOString().split('T')[0]} · {r.startTime}
                                                </p>
                                            </div>
                                            <Badge variant={statusVariant(r.status)}>{statusLabels[r.status] ?? r.status}</Badge>
                                            <div className="font-medium text-sm">R$ --</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Receita por Fonte</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Reservas</p>
                                <p className="text-xs text-muted-foreground">Quadras concluídas</p>
                            </div>
                            <div className="font-bold">{fmt(receitaReservas)}</div>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Bar / Comandas</p>
                                <p className="text-xs text-muted-foreground">Comandas fechadas</p>
                            </div>
                            <div className="font-bold">{fmt(receitaComandas)}</div>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Total</p>
                            <div className="font-bold text-primary">{fmt(receitaTotal)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
