import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, Activity, ShoppingCart } from "lucide-react"
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const statusLabels: Record<string, string> = {
    confirmed: 'Confirmada', checked_in: 'Check-in', completed: 'Concluída', cancelled: 'Cancelada', no_show: 'No Show',
}
const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'checked_in') return 'default'
    if (s === 'completed') return 'secondary'
    if (s === 'cancelled' || s === 'no_show') return 'destructive'
    return 'outline'
}

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ctx = user ? await getClubContext(user.id) : null
    const clubId = ctx?.clubId

    const service = createServiceClient()
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = today.slice(0, 7) + '-01'

    const [reservationsMesRes, reservacoesHojeRes, comandasAbertasRes, receitaComandasRes, receitaReservasRes, recentesRes] = await Promise.all([
        // Total reservas do mês (não canceladas)
        clubId ? service.from('reservations').select('id', { count: 'exact', head: true })
            .eq('club_id', clubId).gte('date', firstOfMonth).neq('status', 'cancelled').neq('status', 'no_show') : Promise.resolve({ count: 0 }),
        // Reservas ativas hoje
        clubId ? service.from('reservations').select('id', { count: 'exact', head: true })
            .eq('club_id', clubId).eq('date', today).in('status', ['confirmed', 'checked_in']) : Promise.resolve({ count: 0 }),
        // Comandas abertas
        clubId ? service.from('comandas').select('id', { count: 'exact', head: true })
            .eq('club_id', clubId).eq('status', 'open') : Promise.resolve({ count: 0 }),
        // Receita de comandas fechadas no mês
        clubId ? service.from('comandas').select('total')
            .eq('club_id', clubId).eq('status', 'closed').gte('closed_at', firstOfMonth + 'T00:00:00') : Promise.resolve({ data: [] }),
        // Receita de reservas concluídas no mês
        clubId ? service.from('reservations').select('total_price')
            .eq('club_id', clubId).eq('status', 'completed').gte('date', firstOfMonth) : Promise.resolve({ data: [] }),
        // Reservas recentes
        clubId ? service.from('reservations').select('id, date, start_time, status, total_price, players, court:courts(name)')
            .eq('club_id', clubId).order('created_at', { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    ])

    const totalReservasMes = reservationsMesRes.count ?? 0
    const totalHoje = reservacoesHojeRes.count ?? 0
    const comandasAbertas = comandasAbertasRes.count ?? 0

    const receitaComandas = ((receitaComandasRes as { data: { total: number }[] | null }).data ?? [])
        .reduce((sum, r) => sum + Number(r.total ?? 0), 0)
    const receitaReservas = ((receitaReservasRes as { data: { total_price: number }[] | null }).data ?? [])
        .reduce((sum, r) => sum + Number(r.total_price ?? 0), 0)
    const receitaTotal = receitaComandas + receitaReservas

    const recentes = (recentesRes as {
        data: Array<{
            id: string; date: string; start_time: string; status: string;
            total_price: number; players: { name: string }[];
            court: { name: string } | null;
        }> | null
    }).data ?? []

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
                        <div className="text-2xl font-bold">{comandasAbertas}</div>
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
                                    const firstName = (r.players?.[0]?.name ?? 'Cliente') || 'Cliente'
                                    const extra = (r.players?.length ?? 0) > 1 ? ` +${(r.players.length - 1)}` : ''
                                    return (
                                        <div key={r.id} className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">{firstName}{extra}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {r.court?.name ?? '—'} · {r.date} · {String(r.start_time).slice(0, 5)}
                                                </p>
                                            </div>
                                            <Badge variant={statusVariant(r.status)}>{statusLabels[r.status] ?? r.status}</Badge>
                                            <div className="font-medium text-sm">{fmt(Number(r.total_price ?? 0))}</div>
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
