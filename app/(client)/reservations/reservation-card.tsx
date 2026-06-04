'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, X } from "lucide-react"
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cancelOwnReservation } from '@/app/actions/reservations'

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

interface ReservationCardProps {
    reservation: Reservation
    isPast?: boolean
    onCancel?: () => void
}

export function ReservationCard({ reservation: r, isPast, onCancel }: ReservationCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const statusLabels: Record<string, string> = {
        confirmed: 'Confirmada', checked_in: 'Check-in', completed: 'Concluída', cancelled: 'Cancelada', no_show: 'No Show',
    }
    const statusVariant = (s: string) => {
        if (['confirmed', 'checked_in'].includes(s)) return 'default' as const
        if (s === 'completed') return 'secondary' as const
        if (['cancelled', 'no_show'].includes(s)) return 'destructive' as const
        return 'outline' as const
    }

    async function handleCancel() {
        setIsDeleting(true)
        try {
            const { error } = await cancelOwnReservation(r.id)
            if (error) {
                toast.error(error)
            } else {
                toast.success('Reserva cancelada com sucesso')
                onCancel?.()
            }
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    const canCancel = !isPast && ['confirmed', 'checked_in'].includes(r.status)

    return (
        <>
            <Card className={`hover:shadow-lg transition-shadow border-2 ${isPast ? 'opacity-80 hover:opacity-100' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className={isPast ? 'text-base line-clamp-1' : 'text-lg line-clamp-1'}>{r.court?.name}</CardTitle>
                        <Badge variant={statusVariant(r.status)} className={isPast ? 'text-xs shrink-0' : 'shrink-0'}>
                            {statusLabels[r.status]}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className={`space-y-${isPast ? '2' : '3'}`}>
                    <div className={`flex items-center gap-2 ${isPast ? 'text-xs' : 'text-sm'}`}>
                        <Calendar className={`${isPast ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground shrink-0`} />
                        <span className={isPast ? '' : 'font-medium'}>
                            {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', isPast ? undefined : {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long'
                            })}
                        </span>
                    </div>
                    <div className={`flex items-center gap-2 ${isPast ? 'text-xs' : 'text-sm'}`}>
                        <Clock className={`${isPast ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground shrink-0`} />
                        <span>{r.start_time} - {r.end_time}</span>
                        <span className="text-muted-foreground">({r.duration}min)</span>
                    </div>
                    {!isPast && <Separator />}
                    <div className={`flex items-center ${isPast ? 'justify-between text-xs' : 'justify-between'}`}>
                        <span className={`${isPast ? '' : 'text-sm'} text-muted-foreground`}>Valor total</span>
                        <span className={`font-bold text-primary ${isPast ? 'text-sm' : 'text-lg'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_price)}
                        </span>
                    </div>
                </CardContent>
                {r.players && r.players.length > 0 && (
                    <CardFooter className={`${isPast ? 'text-xs' : ''} flex-col items-start gap-2 pt-0`}>
                        <span className="font-medium flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                            Jogadores ({r.players.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {r.players.map((p: { name: string }, i: number) => (
                                <Badge key={i} variant="outline" className={`${isPast ? 'text-xs' : ''}`}>
                                    {p.name}
                                </Badge>
                            ))}
                        </div>
                    </CardFooter>
                )}
                {canCancel && (
                    <CardFooter className="pt-0 border-t">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={isDeleting}
                            className="w-full"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar Reserva
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja cancelar esta reserva? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 px-4 bg-muted rounded text-sm">
                        <p className="font-medium">{r.court?.name}</p>
                        <p className="text-muted-foreground">
                            {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {r.start_time}
                        </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Cancelando...' : 'Confirmar Cancelamento'}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
