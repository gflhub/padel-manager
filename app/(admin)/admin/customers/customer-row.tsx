'use client'

import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { TonalBadge } from "@/components/ui/tonal-badge"
import { getInitials, getAvatarColors, formatMemberSince } from "@/lib/format-helpers"
import { Pencil, UserCheck, MoreHorizontal, Link as LinkIcon, UserPen } from "lucide-react"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

export interface CustomerProfile {
    id: string
    name: string
    email: string
    phone: string | null
    cpf: string | null
    avatar_url: string | null
    status: string
}

export interface Customer {
    id: string
    profile_id: string | null
    name: string
    email: string | null
    phone: string | null
    cpf: string | null
    notes: string | null
    active: boolean
    joined_at: string
    profile?: CustomerProfile | null
}

interface CustomerRowProps {
    customer: Customer
    onEdit: (customer: Customer) => void
    onToggleActive: (customer: Customer) => void
    isReadOnly?: boolean
}

export function CustomerRow({ customer, onEdit, onToggleActive, isReadOnly = false }: CustomerRowProps) {
    const initials = getInitials(customer.name)
    const colors = customer.active ? getAvatarColors(customer.name) : { bg: 'bg-slate-100', text: 'text-slate-400' }
    const avatarUrl = customer.profile?.avatar_url ?? null

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={customer.name} />}
                        <AvatarFallback className={`${colors.bg} ${colors.text} text-xs font-semibold`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className={`font-medium leading-tight ${customer.active ? '' : 'text-foreground/70'}`}>
                            {customer.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{customer.email || 'sem email'}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-sm">
                <div style={{ fontFeatureSettings: '"tnum"' }}>{customer.phone || '—'}</div>
                <div className="text-xs text-muted-foreground font-mono">{customer.cpf || '—'}</div>
            </TableCell>
            <TableCell>
                {customer.profile_id ? (
                    <TonalBadge color="blue" dot={false}>
                        <LinkIcon className="h-3 w-3" />
                        Com conta
                    </TonalBadge>
                ) : (
                    <TonalBadge color="slate" dot={false}>
                        <UserPen className="h-3 w-3" />
                        Manual
                    </TonalBadge>
                )}
            </TableCell>
            <TableCell>
                {customer.active ? (
                    <TonalBadge color="emerald">Ativo</TonalBadge>
                ) : (
                    <TonalBadge color="slate">Inativo</TonalBadge>
                )}
            </TableCell>
            <TableCell className="text-sm">
                {(() => {
                    const [main, sub] = formatMemberSince(new Date(customer.joined_at)).split(' · ')
                    return (
                        <>
                            <div className="text-foreground">{main}</div>
                            <div className="text-xs text-muted-foreground">{sub}</div>
                        </>
                    )
                })()}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {customer.active ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onEdit(customer)}
                        disabled={isReadOnly}
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onToggleActive(customer)}
                        disabled={isReadOnly}
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                    >
                        <UserCheck className="h-3.5 w-3.5" />
                        Reativar
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onToggleActive(customer)}
                    title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : (customer.active ? 'Inativar cliente' : 'Editar cliente')}
                    disabled={isReadOnly}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    )
}
