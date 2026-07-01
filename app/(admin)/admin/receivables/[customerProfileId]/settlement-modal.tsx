'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PaymentMethod } from '@/lib/generated/prisma/enums'
import { settleCustomer } from '@/app/actions/receivables'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const brl = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: 'Dinheiro',
    CARD: 'Cartão',
    TRANSFER: 'Transferência',
    PIX: 'PIX',
    OTHER: 'Outro',
}

interface Props {
    customerName: string
    totalAmount: number
    comandasCount: number
    customerProfileId: string
}

export function SettlementModal({ customerName, totalAmount, comandasCount, customerProfileId }: Props) {
    const router = useRouter()
    const [method, setMethod] = useState<PaymentMethod | null>(null)
    const [pending, setPending] = useState(false)

    async function handleConfirm() {
        if (!method) return
        setPending(true)
        const result = await settleCustomer(customerProfileId, method)
        if (result.error) {
            // ponytail: race detection — "já quitados" means another request beat us
            if (result.error.includes('já')) {
                toast.info('Recebíveis já quitados')
                router.refresh()
            } else {
                toast.error(result.error)
            }
            setPending(false)
            return
        }
        const d = result.data!
        toast.success(
            `${d.comandasCount} comanda${d.comandasCount !== 1 ? 's' : ''} quitada${d.comandasCount !== 1 ? 's' : ''} — ${brl(d.totalAmount)}`
        )
        router.push('/admin/receivables')
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">Quitar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Quitar recebíveis de {customerName}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {comandasCount} comanda{comandasCount !== 1 ? 's' : ''} — total{' '}
                        <strong>{brl(totalAmount)}</strong>. Selecione a forma de pagamento para confirmar.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Select onValueChange={(v) => setMethod(v as PaymentMethod)} disabled={pending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                            <SelectItem key={m} value={m}>
                                {METHOD_LABELS[m]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!method || pending}
                        onClick={(e) => {
                            e.preventDefault()
                            handleConfirm()
                        }}
                    >
                        {pending ? 'Quitando...' : 'Confirmar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
