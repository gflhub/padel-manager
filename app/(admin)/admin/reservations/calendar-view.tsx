'use client'

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type Reservation, type Court } from "./reservation-types"

interface CalendarViewProps {
    dates: Date[]
    hours: number[]
    courts: Court[]
    getReservationAt: (date: Date, hour: number, courtId: string) => Reservation | null
    statusColors: Record<string, string>
    statusLabels: Record<string, string>
    onSelectReservation: (r: Reservation) => void
}

export function CalendarView({
    dates,
    hours,
    courts,
    getReservationAt,
    statusColors,
    statusLabels,
    onSelectReservation
}: CalendarViewProps) {
    return (
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
                                                                onClick={() => onSelectReservation(reservation)}
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
}
