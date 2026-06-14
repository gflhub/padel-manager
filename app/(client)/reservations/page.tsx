import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from 'next/link'
import { Calendar, Plus, History } from "lucide-react"
import { ReservationCard } from './reservation-card'
import { requireUser } from '@/lib/auth/session'
import { getUserReservations } from '@/lib/repositories/reservations'

export const dynamic = 'force-dynamic'

export default async function ClientReservationsPage() {
    const user = await requireUser()
    const { data: reservations } = await getUserReservations(user.id)

    const today = new Date().toISOString().split('T')[0]
    const upcoming = (reservations || []).filter((r) => r.date >= today && !['CANCELLED'].includes(r.status))
    const past = (reservations || []).filter((r) => r.date < today || ['CANCELLED', 'COMPLETED'].includes(r.status))

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
                        {upcoming.map((r) => (
                            <ReservationCard key={r.id} reservation={r} />
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
                        {past.slice(0, 12).map((r) => (
                            <ReservationCard key={r.id} reservation={r} isPast={true} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
