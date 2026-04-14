import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from 'next/link'
import { Calendar, Clock, Plus, History } from "lucide-react"

interface Reservation {
    id: string
    date: string
    start_time: string
    end_time: string
    duration: number
    total_price: number
    status: string
    players: { name: string }[]
    court: { name: string; court_type: string } | null
}

export default async function ClientReservationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: reservations } = await supabase
        .from('reservations')
        .select('*, court:courts(name, court_type)')
        .eq('profile_id', user.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

    const statusLabels: Record<string, string> = {
        confirmed: 'Confirmada', checked_in: 'Check-in', completed: 'Concluída', cancelled: 'Cancelada', no_show: 'No Show',
    }
    const statusVariant = (s: string) => {
        if (['confirmed', 'checked_in'].includes(s)) return 'default' as const
        if (s === 'completed') return 'secondary' as const
        if (['cancelled', 'no_show'].includes(s)) return 'destructive' as const
        return 'outline' as const
    }

    const today = new Date().toISOString().split('T')[0]
    const upcoming = (reservations as Reservation[] || []).filter((r: Reservation) => r.date >= today && !['cancelled', 'no_show'].includes(r.status))
    const past = (reservations as Reservation[] || []).filter((r: Reservation) => r.date < today || ['cancelled', 'no_show', 'completed'].includes(r.status))

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Minhas Reservas</h1>
                    <p className="text-muted-foreground mt-1">Acompanhe e gerencie suas reservas</p>
                </div>
                <Button size="lg" asChild className="shadow-md">
                    <Link href="/reservations/new">
                        <Plus className="mr-2 h-5 w-5" />
                        Nova Reserva
                    </Link>
                </Button>
            </div>

            {/* Upcoming Reservations */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Próximas Reservas</h2>
                    <Badge variant="secondary" className="ml-2">{upcoming.length}</Badge>
                </div>

                {upcoming.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma reserva futura</p>
                            <p className="text-sm text-muted-foreground mb-4">Que tal agendar um jogo?</p>
                            <Button asChild>
                                <Link href="/reservations/new">Fazer Reserva</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcoming.map((r: Reservation) => (
                            <Card key={r.id} className="hover:shadow-lg transition-shadow border-2">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-lg line-clamp-1">{r.court?.name}</CardTitle>
                                        <Badge variant={statusVariant(r.status)} className="shrink-0">
                                            {statusLabels[r.status]}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium">
                                            {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span>{r.start_time} - {r.end_time}</span>
                                        <span className="text-muted-foreground">({r.duration}min)</span>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Valor total</span>
                                        <span className="text-lg font-bold text-primary">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_price)}
                                        </span>
                                    </div>
                                </CardContent>
                                {r.players && r.players.length > 0 && (
                                    <CardFooter className="flex-col items-start gap-2 pt-0 text-sm">
                                        <span className="font-medium flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                                            Jogadores ({r.players.length})
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {r.players.map((p: { name: string }, i: number) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {p.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            <Separator className="my-8" />

            {/* Past Reservations */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Histórico</h2>
                    <Badge variant="outline" className="ml-2">{past.length}</Badge>
                </div>

                {past.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma reserva anterior.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {past.slice(0, 12).map((r: Reservation) => (
                            <Card key={r.id} className="opacity-80 hover:opacity-100 transition-opacity">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base line-clamp-1">{r.court?.name}</CardTitle>
                                        <Badge variant={statusVariant(r.status)} className="text-xs shrink-0">
                                            {statusLabels[r.status]}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {r.start_time} - {r.end_time}
                                    </p>
                                    <p className="font-semibold text-sm">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_price)}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
