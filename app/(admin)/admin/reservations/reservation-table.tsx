'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReservationRow } from "./reservation-row"
import { type Reservation } from "./reservation-types"

interface ReservationTableProps {
    items: Reservation[]
    onView: (r: Reservation) => void
    onStatusChange: (id: string, status: string) => void
    isReadOnly?: boolean
}

export function ReservationTable({ items, onView, onStatusChange, isReadOnly = false }: ReservationTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhuma reserva encontrada.
                        </TableCell>
                    </TableRow>
                ) : items.map((r) => (
                    <ReservationRow
                        key={r.id}
                        reservation={r}
                        onView={onView}
                        onStatusChange={onStatusChange}
                        isReadOnly={isReadOnly}
                    />
                ))}
            </TableBody>
        </Table>
    )
}
