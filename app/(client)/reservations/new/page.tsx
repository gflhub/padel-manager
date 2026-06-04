'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createReservation, getAvailableCourts, getBookedSlots } from "@/app/actions/reservations"
import { getProfile } from "@/app/actions/profiles"
import { toast } from "sonner"
import { ArrowLeft, Minus, Plus, Users, Clock, Calendar, ShieldCheck } from "lucide-react"
import Link from 'next/link'

interface Court {
    id: string
    name: string
    court_type: string
    price_per_slot: number
    duration_slot: number
}

interface BookedSlot {
    start_time: string
    end_time: string
}

const toMin = (t: string) => {
    const [h, m] = String(t).slice(0, 5).split(':').map(Number)
    return h * 60 + m
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function NewReservationPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preSelectedCourtId = searchParams.get('court_id')

    const [courts, setCourts] = useState<Court[]>([])
    const [selectedCourtId, setSelectedCourtId] = useState(preSelectedCourtId || '')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [startTime, setStartTime] = useState('')
    const [players, setPlayers] = useState<{ name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([])
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [ownerName, setOwnerName] = useState('')

    useEffect(() => {
        const loadCourts = async () => {
            const result = await getAvailableCourts()
            if (result.data) {
                setCourts(result.data)
            }
        }

        const loadProfile = async () => {
            const result = await getProfile()
            if (result.data) {
                const name = result.data.name || ''
                setOwnerName(name)
                setPlayers([{ name }])
            }
        }

        loadCourts()
        loadProfile()
    }, [])

    useEffect(() => {
        const load = async () => {
            setStartTime('')
            if (!selectedCourtId || !date) {
                setBookedSlots([])
                setLoadingSlots(false)
                return
            }
            setLoadingSlots(true)
            const result = await getBookedSlots(selectedCourtId, date)
            setBookedSlots(result.data || [])
            setLoadingSlots(false)
        }
        load()
    }, [selectedCourtId, date])

    const selectedCourt = courts.find(c => c.id === selectedCourtId)

    const timeSlots = useMemo(() => {
        const duration = selectedCourt?.duration_slot || 60
        const slots: string[] = []
        for (let m = 7 * 60; m <= 22 * 60; m += duration) {
            slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
        }
        return slots
    }, [selectedCourt?.duration_slot])

    const isBooked = (slot: string) => {
        const duration = selectedCourt?.duration_slot || 60
        const slotStart = toMin(slot)
        const slotEnd = slotStart + duration
        return bookedSlots.some(r => toMin(r.start_time) < slotEnd && toMin(r.end_time) > slotStart)
    }

    const addPlayer = () => setPlayers(prev => [...prev, { name: '' }])
    const removePlayer = (i: number) => setPlayers(prev => prev.filter((_, idx) => idx !== i))
    const updatePlayer = (i: number, name: string) => setPlayers(prev => prev.map((p, idx) => idx === i ? { name } : p))

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedCourtId || !date || !startTime) { toast.error('Selecione a quadra, data e horário.'); return }
        setLoading(true)
        const formData = new FormData()
        formData.set('court_id', selectedCourtId)
        formData.set('date', date)
        formData.set('start_time', startTime)
        formData.set('duration', String(selectedCourt?.duration_slot || 60))
        formData.set('players', JSON.stringify(players.filter(p => p.name.trim())))
        const result = await createReservation(formData)
        if (result.error) { toast.error(result.error) } else {
            toast.success('Reserva criada com sucesso!')
            router.push('/reservations')
        }
        setLoading(false)
    }

    const validPlayers = players.filter(p => p.name.trim())
    const playerCount = validPlayers.length || 1

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild><Link href="/"><ArrowLeft className="h-5 w-5" /></Link></Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Nova Reserva</h2>
                    <p className="text-muted-foreground">Preencha os dados.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Dados da Reserva</CardTitle></CardHeader>
                    <CardContent className="space-y-6">

                        <div className="space-y-2">
                            <Label>Quadra</Label>
                            <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                                <SelectTrigger><SelectValue placeholder="Selecione uma quadra" /></SelectTrigger>
                                <SelectContent>
                                    {courts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} — {fmt(c.price_per_slot)} · {c.duration_slot} min
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Data</Label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />Horário
                                {selectedCourt && (
                                    <span className="text-xs text-muted-foreground font-normal">
                                        — slots de {selectedCourt.duration_slot} min
                                    </span>
                                )}
                            </Label>

                            {!selectedCourt ? (
                                <p className="text-sm text-muted-foreground py-2 px-1">Selecione uma quadra para ver os horários disponíveis.</p>
                            ) : loadingSlots ? (
                                <p className="text-sm text-muted-foreground py-2 px-1">Carregando horários...</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
                                        {timeSlots.map(slot => {
                                            const booked = isBooked(slot)
                                            const selected = startTime === slot
                                            return (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    disabled={booked}
                                                    onClick={() => setStartTime(slot)}
                                                    title={booked ? 'Horário já reservado' : slot}
                                                    className={[
                                                        'rounded-md border text-sm font-medium py-2 px-1 transition-colors select-none',
                                                        booked
                                                            ? 'border-muted bg-muted/30 text-muted-foreground/30 cursor-not-allowed line-through'
                                                            : selected
                                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                                : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer',
                                                    ].join(' ')}
                                                >
                                                    {slot}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border border-primary bg-primary" />Selecionado</span>
                                        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded border border-muted bg-muted/30" />Ocupado</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {selectedCourt && startTime && (
                            <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Início:</span> <strong>{startTime}</strong></p>
                                <p><span className="text-muted-foreground">Duração:</span> <strong>{selectedCourt.duration_slot} minutos</strong></p>
                                <p><span className="text-muted-foreground">Preço total:</span> <strong>{fmt(selectedCourt.price_per_slot)}</strong></p>
                                <p><span className="text-muted-foreground">Por jogador ({playerCount}):</span> <strong>{fmt(selectedCourt.price_per_slot / playerCount)}</strong></p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2"><Users className="h-4 w-4" />Jogadores</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addPlayer}>
                                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                                </Button>
                            </div>

                            {/* Titular fixo */}
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2">
                                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{ownerName || 'Carregando...'}</p>
                                    <p className="text-xs text-muted-foreground">Titular da reserva</p>
                                </div>
                            </div>

                            {/* Jogadores adicionais */}
                            {players.map((player, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                                    <Input placeholder={`Nome do jogador ${i + 1}`} value={player.name} onChange={e => updatePlayer(i, e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePlayer(i)}><Minus className="h-4 w-4" /></Button>
                                </div>
                            ))}

                            {players.length === 0 && (
                                <p className="text-xs text-muted-foreground px-1">Nenhum jogador adicional. A quadra será reservada apenas para o titular.</p>
                            )}
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading || !selectedCourtId || !startTime}>
                            {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}
