'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { updateReservationStatus } from "@/app/actions/reservations"
import { toast } from "sonner"
import { CheckCircle, XCircle, Calendar as CalendarIcon, List, CalendarCheck, UserCheck, Search } from "lucide-react"
import { format, addDays } from "date-fns"
import { SummaryBar } from "@/components/summary-bar"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"
import { type Reservation, type Court } from "./reservation-types"
import { CalendarView } from "./calendar-view"
import { ReservationTable } from "./reservation-table"

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmada',
    checked_in: 'Check-in',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    no_show: 'No Show',
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    confirmed: 'bg-green-100 border-green-300 text-green-800',
    checked_in: 'bg-blue-100 border-blue-300 text-blue-800',
    completed: 'bg-gray-100 border-gray-300 text-gray-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
    no_show: 'bg-orange-100 border-orange-300 text-orange-800',
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    confirmed: 'default',
    checked_in: 'default',
    completed: 'secondary',
    cancelled: 'destructive',
    pending: 'outline',
    no_show: 'outline',
}

export default function AdminReservationsClient({ 
    reservations: initialReservations, 
    isReadOnly = false 
}: { 
    reservations: Reservation[]; 
    isReadOnly?: boolean 
}) {
    const [reservations, setReservations] = useState(initialReservations)
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
    const [search, setSearch] = useState('')

    const handleStatusChange = async (id: string, status: string) => {
        const result = await updateReservationStatus(id, status)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Status atualizado!')
            setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        }
    }

    // Gerar próximos 3 dias (hoje, amanhã, depois de amanhã)
    const dates = useMemo(() => {
        const today = new Date()
        return [today, addDays(today, 1), addDays(today, 2)]
    }, [])

    // Horários de funcionamento (8h às 22h)
    const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 8), [])

    // Obter quadras únicas das reservas
    const courts = useMemo(() => {
        const courtMap = new Map<string, Court>()
        const uniqueCourts: Court[] = []
        reservations.forEach(r => {
            if (r.court && !courtMap.has(r.court.id)) {
                const court = { id: r.court.id, name: r.court.name }
                courtMap.set(r.court.id, court)
                uniqueCourts.push(court)
            }
        })
        return uniqueCourts
    }, [reservations])

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

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
    
    const todayReservations = useMemo(() => reservations.filter(r => r.date === todayStr), [reservations, todayStr])
    const upcomingReservations = useMemo(() => reservations.filter(r => r.date > todayStr), [reservations, todayStr])
    const pastReservations = useMemo(() => reservations.filter(r => r.date < todayStr), [reservations, todayStr])

    const todayActive = todayReservations.filter(r => r.status !== 'cancelled' && r.status !== 'no_show')
    const todayRevenue = todayActive.reduce((sum, r) => sum + (r.total_price || 0), 0)
    const pendingCheckins = todayReservations.filter(r => r.status === 'confirmed').length
    const todayCancellations = todayReservations.filter(r => r.status === 'cancelled').length

    const matchesSearch = useCallback((r: Reservation) => {
        if (!search.trim()) return true
        const term = search.trim().toLowerCase()
        const clientNames = (r.players || []).map(p => p.name?.toLowerCase() || '')
        return clientNames.some(n => n.includes(term)) || (r.court?.name?.toLowerCase().includes(term) ?? false)
    }, [search])

    const filteredToday = useMemo(() => todayReservations.filter(matchesSearch), [todayReservations, matchesSearch])
    const filteredUpcoming = useMemo(() => upcomingReservations.filter(matchesSearch), [upcomingReservations, matchesSearch])
    const filteredPast = useMemo(() => pastReservations.filter(matchesSearch), [pastReservations, matchesSearch])
    const filteredAll = useMemo(() => reservations.filter(matchesSearch), [reservations, matchesSearch])

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

            <SummaryBar
                hero={{
                    label: "Reservas Hoje",
                    value: String(todayReservations.length),
                    suffix: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(todayRevenue),
                    icon: CalendarCheck,
                }}
                items={[
                    {
                        label: "Check-ins Pendentes",
                        value: String(pendingCheckins),
                        icon: UserCheck,
                        iconClassName: "text-amber-600",
                        iconBgClassName: "bg-amber-50",
                    },
                    {
                        label: "Cancelamentos Hoje",
                        value: String(todayCancellations),
                        icon: XCircle,
                        iconClassName: "text-red-500",
                        iconBgClassName: "bg-red-50",
                    },
                ]}
            />

            {viewMode === 'calendar' ? (
                <CalendarView 
                    dates={dates}
                    hours={hours}
                    courts={courts}
                    getReservationAt={getReservationAt}
                    statusColors={STATUS_COLORS}
                    statusLabels={STATUS_LABELS}
                    onSelectReservation={setSelectedReservation}
                />
            ) : (
                <Tabs defaultValue="today">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <TabsList>
                            <TabsTrigger value="today">Hoje ({todayReservations.length})</TabsTrigger>
                            <TabsTrigger value="upcoming">Próximas ({upcomingReservations.length})</TabsTrigger>
                            <TabsTrigger value="past">Passadas ({pastReservations.length})</TabsTrigger>
                            <TabsTrigger value="all">Todas ({reservations.length})</TabsTrigger>
                        </TabsList>
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar cliente ou quadra…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 w-56 pl-8"
                            />
                        </div>
                    </div>
                    <TabsContent value="today">
                        <Card><CardContent className="pt-6">
                            <ReservationTable items={filteredToday} onView={setSelectedReservation} onStatusChange={handleStatusChange} isReadOnly={isReadOnly} />
                        </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="upcoming">
                        <Card><CardContent className="pt-6">
                            <ReservationTable items={filteredUpcoming} onView={setSelectedReservation} onStatusChange={handleStatusChange} isReadOnly={isReadOnly} />
                        </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="past">
                        <Card><CardContent className="pt-6">
                            <ReservationTable items={filteredPast} onView={setSelectedReservation} onStatusChange={handleStatusChange} isReadOnly={isReadOnly} />
                        </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="all">
                        <Card><CardContent className="pt-6">
                            <ReservationTable items={filteredAll} onView={setSelectedReservation} onStatusChange={handleStatusChange} isReadOnly={isReadOnly} />
                        </CardContent></Card>
                    </TabsContent>
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
                                <div><Label className="text-muted-foreground">Status</Label><Badge variant={STATUS_VARIANTS[selectedReservation.status] || 'outline'}>{STATUS_LABELS[selectedReservation.status]}</Badge></div>
                                <div><Label className="text-muted-foreground">Valor por Hora</Label><p className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedReservation.price_per_hour)}</p></div>
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
                                        <Button className="flex-1" disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined} onClick={() => {
                                            handleStatusChange(selectedReservation.id, 'checked_in')
                                            setSelectedReservation(null)
                                        }}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Fazer Check-in
                                        </Button>
                                        <Button variant="destructive" className="flex-1" disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined} onClick={() => {
                                            handleStatusChange(selectedReservation.id, 'cancelled')
                                            setSelectedReservation(null)
                                        }}>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancelar
                                        </Button>
                                    </>
                                )}
                                {selectedReservation.status === 'checked_in' && (
                                    <Button className="w-full" disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined} onClick={() => {
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
