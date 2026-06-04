import { getClubContext } from '@/lib/get-club-role'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, Users } from 'lucide-react'

export default async function StaffDashboardPage() {
  // For now, we need to get the user ID from somewhere.
  // In a full implementation, this would come from the session/JWT.
  // Placeholder: redirect to login if no user context
  const userId = null // This needs to be passed from middleware/session
  if (!userId) {
    redirect('/login')
  }

  const clubContext = await getClubContext(userId)
  if (!clubContext) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(today)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const reservations = await prisma.reservation.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrowStart
      },
      court: {
        clubId: clubContext.clubId
      },
      status: { not: 'CANCELLED' }
    },
    include: {
      court: { select: { name: true, type: true } },
      profile: { select: { name: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'Confirmada',
    PENDING: 'Pendente',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
  }

  const statusVariant = (s: string) => {
    if (s === 'PENDING') return 'default' as const
    if (s === 'COMPLETED') return 'secondary' as const
    if (s === 'CANCELLED') return 'destructive' as const
    return 'outline' as const
  }

  const upcomingReservations = (reservations || []).filter(
    (r: any) => ['CONFIRMED', 'PENDING'].includes(r.status)
  )
  const completedReservations = (reservations || []).filter(
    (r: any) => r.status === 'COMPLETED'
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard - {new Date(today).toLocaleDateString('pt-BR')}</h1>
        <p className="text-muted-foreground mt-1">Acompanhe as reservas e operações de hoje</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reservas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReservations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">em andamento ou confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingReservations.filter((r: any) => r.status === 'checked_in').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">já realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReservations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">finalizadas hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Reservations */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Reservas de Hoje</h2>
        {upcomingReservations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma reserva para hoje</p>
              <p className="text-sm text-muted-foreground mt-1">Dia tranquilo!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingReservations.map((reservation: any) => (
              <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{reservation.court?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Usuário: {reservation.profile?.name}
                        </p>
                      </div>
                      <Badge variant={statusVariant(reservation.status)}>
                        {statusLabels[reservation.status]}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reservation.startTime} - {reservation.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          2 jogador(es)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">
                          R$ --
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed Reservations */}
      {completedReservations.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Concluídas Today</h2>
          <div className="space-y-2">
            {completedReservations.map((reservation: any) => (
              <Card key={reservation.id} className="opacity-75">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{reservation.court?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {reservation.startTime} - {reservation.endTime}
                      </p>
                    </div>
                    <Badge variant="secondary">Concluída</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
