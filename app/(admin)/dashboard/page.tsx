import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TonalBadge, type TonalColor } from "@/components/ui/tonal-badge"
import { SummaryBar } from "@/components/summary-bar"
import { DollarSign, CalendarCheck, Activity, Receipt } from "lucide-react"
import { prisma } from '@/lib/db/prisma'
import { getClubContext } from '@/lib/get-club-role'
import { getCurrentUser } from '@/lib/auth/session'
import { getInitials, getAvatarColors, formatHumanDateTime } from '@/lib/format-helpers'
import { getComandaRevenueByClub } from '@/lib/repositories/payments'
import { getReservationRevenueByClub } from '@/lib/repositories/reservations'
import { TESTIDS } from '@/lib/testids'

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const statusLabels: Record<string, string> = {
    CONFIRMED: 'Confirmada', PENDING: 'Pendente', COMPLETED: 'Concluída', CANCELLED: 'Cancelada',
}
const statusTone: Record<string, TonalColor> = {
    CONFIRMED: 'blue', PENDING: 'amber', COMPLETED: 'slate', CANCELLED: 'red',
}

type Reservation = {
    id: string
    status: string
    date: Date
    startTime: string
    court: { name: string } | null
    profile: { name: string | null } | null
}

const COURT_DOTS = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-violet-500']
const courtDot = (name: string | null | undefined) => {
    const str = name ?? '?'
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
    return COURT_DOTS[Math.abs(hash) % COURT_DOTS.length]
}

function ReservationRow({ r }: { r: Reservation }) {
    const { bg, text } = getAvatarColors(r.profile?.name)
    const tone = statusTone[r.status] ?? 'slate'

    return (
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-muted/70 transition-colors">
            <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className={`${bg} ${text} text-xs font-semibold`}>
                    {getInitials(r.profile?.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{r.profile?.name ?? 'Cliente'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${courtDot(r.court?.name)}`} />
                    {r.court?.name ?? '—'}
                    <span className="text-border">·</span>
                    {formatHumanDateTime(r.date, r.startTime)}
                </p>
            </div>
            <TonalBadge color={tone}>{statusLabels[r.status] ?? r.status}</TonalBadge>
            <span className="font-semibold text-sm w-[72px] text-right text-muted-foreground">—</span>
        </div>
    )
}

export default async function AdminDashboard() {
    const user = await getCurrentUser()
    const ctx = user?.profileId ? await getClubContext(user.profileId) : null
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
        recentes,
        receitaComandasSum,
        receitaReservasSum
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
        }) : Promise.resolve([]),
        clubId ? getComandaRevenueByClub(clubId, firstOfMonth, tomorrowStart) : Promise.resolve(0),
        clubId ? getReservationRevenueByClub(clubId, firstOfMonth, tomorrowStart) : Promise.resolve(0)
    ])

    const totalReservasMes = reservationsMes ?? 0
    const totalHoje = reservationsToday ?? 0
    const comandasAbertasCount = comandasAbertas ?? 0

    const receitaComandas = receitaComandasSum ?? 0
    const receitaReservas = receitaReservasSum ?? 0
    const receitaTotal = receitaComandas + receitaReservas

    return (
        <div className="space-y-6" data-testid={TESTIDS.ADMIN_DASHBOARD}>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral do seu complexo esportivo.</p>
            </div>

            <SummaryBar
                hero={{ label: "Receita Total (Mês)", value: fmt(receitaTotal), icon: DollarSign, testId: TESTIDS.TODAY_REVENUE }}
                items={[
                    { label: "Reservas no Mês", value: String(totalReservasMes), icon: CalendarCheck, iconClassName: "text-primary", iconBgClassName: "bg-blue-50" },
                    { label: "Reservas Hoje", value: String(totalHoje), icon: Activity, iconClassName: "text-violet-600", iconBgClassName: "bg-violet-50", testId: TESTIDS.RESERVAS_HOJE },
                    { label: "Comandas Abertas", value: String(comandasAbertasCount), icon: Receipt, iconClassName: "text-amber-600", iconBgClassName: "bg-amber-50" },
                ]}
            />

            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Reservas Recentes</CardTitle>
                        <Link href="/admin/reservations" className="text-xs font-medium text-primary hover:underline">
                            Ver todas
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentes.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma reserva encontrada.</p>
                        ) : (
                            <div className="-mx-2">
                                {recentes.map(r => <ReservationRow key={r.id} r={r} />)}
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
