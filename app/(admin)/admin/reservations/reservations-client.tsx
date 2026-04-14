'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { updateReservationStatus } from "@/app/actions/reservations"
import { toast } from "sonner"
import { CheckCircle, XCircle, Eye, Calendar as CalendarIcon, List } from "lucide-react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Reservation {
    id: string
    date: string
    start_time: string
    end_time: string
    duration: number
    total_price: number
    status: string
    players: { name: string }[]
    court: { id: string; name: string; court_type: string } | null
}

interface Court {
    id: string
    name: string
}

export default function AdminReservationsClient({ reservations: initialReservations }: { reservations: Reservation[] }) {
    const [reservations, setReservations] = useState(initialReservations)
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

    const handleStatusChange = async (id: string, status: string) => {
        const result = await updateReservationStatus(id, status)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Status atualizado!')
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        }
    }

    const statusLabels: Record<string, string> = {
        pending: 'Pendente',
        confirmed: 'Confirmada',
        checked_in: 'Check-in',
        completed: 'Concluída',
        cancelled: 'Cancelada',
        no_show: 'No Show',
    }

    const statusVariant = (s: string) => {
        if (s === 'confirmed') return 'default' as const
        if (s === 'checked_in') return 'default' as const
        if (s === 'completed') return 'secondary' as const
        if (s === 'cancelled') return 'destructive' as const
        return 'outline' as const
    }

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        confirmed: 'bg-green-100 border-green-300 text-green-800',
        checked_in: 'bg-blue-100 border-blue-300 text-blue-800',
        completed: 'bg-gray-100 border-gray-300 text-gray-800',
        cancelled: 'bg-red-100 border-red-300 text-red-800',
        no_show: 'bg-orange-100 border-orange-300 text-orange-800',
    }

    // Gerar próximos 3 dias (hoje, amanhã, depois de amanhã)
    const todayDate = new Date()
    const dates = [
        todayDate,
        addDays(todayDate, 1),
        addDays(todayDate, 2)
    ]

    // Horários de funcionamento (8h às 22h)
    const hours = Array.from({ length: 14 }, (_, i) => i + 8) // 8 até 21

    // Obter quadras únicas das reservas
    const courts: Court[] = []
    const courtMap = new Map<string, Court>()

    reservations.forEach(r => {
        if (r.court && !courtMap.has(r.court.id)) {
            courtMap.set(r.court.id, { id: r.court.id, name: r.court.name })
            courts.push({ id: r.court.id, name: r.court.name })
        }
    })

    // Função para encontrar reserva em um horário/quadra/data específicos
    const getReservationAt = (date: Date, hour: number, courtId: string): Reservation | null => {
        const dateStr = format(date, 'yyyy-MM-dd')

        return reservations.find(r => {
            if (r.date !== dateStr || r.court?.id !== courtId) return false

            const startHour = parseInt(r.start_time.split(':')[0])
            const endHour = parseInt(r.end_time.split(':')[0])

            return hour >= startHour && hour < endHour
        }) || null
    }

    // Visualização de Calendário
    const CalendarView = () => (
        <div className="space-y-8">
            {dates.map((date, dayIndex) => (
                <Card key={dayIndex}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            {dayIndex === 0 && <Badge variant="default">Hoje</Badge>}
                            {dayIndex === 1 && <Badge variant="secondary">Amanhã</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="border p-2 bg-muted text-left font-semibold text-sm w-32">Quadra</th>
                                        {hours.map(hour => (
                                            <th key={hour} className="border p-2 bg-muted text-center text-xs font-medium min-w-[80px]">
                                                {hour}:00
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {courts.length === 0 ? (
                                        <tr>
                                            <td colSpan={hours.length + 1} className="border p-8 text-center text-muted-foreground">
                                                Nenhuma quadra com reservas
                                            </td>
                                        </tr>
                                    ) : (
                                        courts.map(court => (
                                            <tr key={court.id}>
                                                <td className="border p-3 font-medium bg-muted/50">
                                                    {court.name}
                                                </td>
                                                {hours.map(hour => {
                                                    const reservation = getReservationAt(date, hour, court.id)
                                                    const startHour = reservation ? parseInt(reservation.start_time.split(':')[0]) : null

                                                    // Só renderizar a célula se for o início da reserva
                                                    if (reservation && hour === startHour) {
                                                        const durationHours = reservation.duration / 60

                                                        return (
                                                            <td
                                                                key={`${court.id}-${hour}`}
                                                                colSpan={Math.ceil(durationHours)}
                                                                className={cn(
                                                                    "border p-2 cursor-pointer hover:opacity-80 transition-opacity",
                                                                    statusColors[reservation.status] || 'bg-gray-100'
                                                                )}
                                                                onClick={() => setSelectedReservation(reservation)}
                                                            >
                                                                <div className="text-xs font-medium">
                                                                    {reservation.start_time} - {reservation.end_time}
                                                                </div>
                                                                <div className="text-[10px] mt-1 opacity-75">
                                                                    {reservation.players?.length || 0} jogadores
                                                                </div>
                                                                <div className="text-[10px] font-semibold mt-0.5">
                                                                    {statusLabels[reservation.status]}
                                                                </div>
                                                            </td>
                                                        )
                                                    }

                                                    // Pular células cobertas por reservas anteriores
                                                    if (reservation && hour > startHour!) {
                                                        return null
                                                    }

                                                    // Célula vazia
                                                    return (
                                                        <td key={`${court.id}-${hour}`} className="border p-2 bg-white hover:bg-gray-50">
                                                            <div className="text-xs text-muted-foreground text-center">-</div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )

    // Visualização de Lista
    const todayStr = new Date().toISOString().split('T')[0]
    const todayReservations = reservations.filter(r => r.date === todayStr)
    const upcomingReservations = reservations.filter(r => r.date > todayStr)
    const pastReservations = reservations.filter(r => r.date < todayStr)

    const ReservationTable = ({ items }: { items: Reservation[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Jogadores</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhuma reserva encontrada.
                        </TableCell>
                    </TableRow>
                ) : items.map((r) => (
                    <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.start_time} - {r.end_time}</TableCell>
                        <TableCell>{r.court?.name || '-'}</TableCell>
                        <TableCell>{r.players?.length || 0}</TableCell>
                        <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_price)}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedReservation(r)}><Eye className="h-4 w-4" /></Button>
                            {r.status === 'confirmed' && (
                                <>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(r.id, 'checked_in')} title="Check-in"><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleStatusChange(r.id, 'cancelled')} title="Cancelar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                                </>
                            )}
                            {r.status === 'checked_in' && (
                                <Button variant="ghost" size="icon" onClick={() => handleStatusChange(r.id, 'completed')} title="Concluir"><CheckCircle className="h-4 w-4 text-blue-600" /></Button>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reservas</h1>
                    <p className="text-muted-foreground">Gerencie todas as reservas do complexo.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'calendar' ? 'default' : 'outline'}
                        onClick={() => setViewMode('calendar')}
                        className="gap-2"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Calendário
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        onClick={() => setViewMode('list')}
                        className="gap-2"
                    >
                        <List className="h-4 w-4" />
                        Lista
                    </Button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <CalendarView />
            ) : (
                <Tabs defaultValue="today">
                    <TabsList>
                        <TabsTrigger value="today">Hoje ({todayReservations.length})</TabsTrigger>
                        <TabsTrigger value="upcoming">Próximas ({upcomingReservations.length})</TabsTrigger>
                        <TabsTrigger value="past">Passadas ({pastReservations.length})</TabsTrigger>
                        <TabsTrigger value="all">Todas ({reservations.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="today"><Card><CardContent className="pt-6"><ReservationTable items={todayReservations} /></CardContent></Card></TabsContent>
                    <TabsContent value="upcoming"><Card><CardContent className="pt-6"><ReservationTable items={upcomingReservations} /></CardContent></Card></TabsContent>
                    <TabsContent value="past"><Card><CardContent className="pt-6"><ReservationTable items={pastReservations} /></CardContent></Card></TabsContent>
                    <TabsContent value="all"><Card><CardContent className="pt-6"><ReservationTable items={reservations} /></CardContent></Card></TabsContent>
                </Tabs>
            )}

            <Dialog open={!!selectedReservation} onOpenChange={(o) => !o && setSelectedReservation(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes da Reserva</DialogTitle>
                    </DialogHeader>
                    {selectedReservation && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-muted-foreground">Data</Label><p className="font-medium">{selectedReservation.date}</p></div>
                                <div><Label className="text-muted-foreground">Horário</Label><p className="font-medium">{selectedReservation.start_time} - {selectedReservation.end_time}</p></div>
                                <div><Label className="text-muted-foreground">Quadra</Label><p className="font-medium">{selectedReservation.court?.name || '-'}</p></div>
                                <div><Label className="text-muted-foreground">Status</Label><Badge variant={statusVariant(selectedReservation.status)}>{statusLabels[selectedReservation.status]}</Badge></div>
                                <div><Label className="text-muted-foreground">Valor Total</Label><p className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedReservation.total_price)}</p></div>
                                <div><Label className="text-muted-foreground">Duração</Label><p className="font-medium">{selectedReservation.duration} min</p></div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Jogadores</Label>
                                <div className="mt-1 space-y-1">
                                    {selectedReservation.players?.map((p, i) => (
                                        <p key={i} className="text-sm">{i + 1}. {p.name}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4 border-t">
                                {selectedReservation.status === 'confirmed' && (
                                    <>
                                        <Button className="flex-1" onClick={() => {
                                            handleStatusChange(selectedReservation.id, 'checked_in')
                                            setSelectedReservation(null)
                                        }}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Fazer Check-in
                                        </Button>
                                        <Button variant="destructive" className="flex-1" onClick={() => {
                                            handleStatusChange(selectedReservation.id, 'cancelled')
                                            setSelectedReservation(null)
                                        }}>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancelar
                                        </Button>
                                    </>
                                )}
                                {selectedReservation.status === 'checked_in' && (
                                    <Button className="w-full" onClick={() => {
                                        handleStatusChange(selectedReservation.id, 'completed')
                                        setSelectedReservation(null)
                                    }}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Marcar como Concluída
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
