'use client'

import { useState, useMemo, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { createCustomer, updateCustomer, toggleCustomerActive, checkCpfStatus } from "@/app/actions/customers"
import { toast } from "sonner"
import { Plus, Search, Link as LinkIcon, Users, UserPen, UserPlus, Loader2, AlertCircle, UserCheck, Lock } from "lucide-react"
import { SummaryBar } from "@/components/summary-bar"
import { CustomerRow, type Customer } from "./customer-row"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

// ─── Tipos auxiliares ─────────────────────────────────────────
type CpfCheckState = 'idle' | 'checking' | 'not-found' | 'found' | 'member'

interface FoundProfile {
    id: string
    name: string | null
    email: string
    status: string | null
}

// ─── Helpers de formatação ────────────────────────────────────
function formatCpf(value: string) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .slice(0, 14)
}

function formatPhone(value: string) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
        .slice(0, 15)
}

function isValidCpf(cpf: string) {
    return cpf.replace(/\D/g, '').length === 11
}

export default function CustomersClient({ customers: initialCustomers, isReadOnly = false }: { customers: Customer[]; isReadOnly?: boolean }) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
    const [openCreate, setOpenCreate] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'withAccount'>('all')

    // ── Estado do formulário de criação ──
    const [cpfInput, setCpfInput] = useState('')
    const [nameInput, setNameInput] = useState('')
    const [emailInput, setEmailInput] = useState('')
    const [phoneInput, setPhoneInput] = useState('')
    const [cpfCheckState, setCpfCheckState] = useState<CpfCheckState>('idle')
    const [foundProfile, setFoundProfile] = useState<FoundProfile | null>(null)

    // ── Popup de confirmação de vínculo ──
    const [showConfirmLink, setShowConfirmLink] = useState(false)
    const pendingSubmitRef = useRef<FormData | null>(null)

    // ── Estado do formulário de edição ──
    const [editPhone, setEditPhone] = useState('')

    const metrics = useMemo(() => {
        const total = customers.length
        const active = customers.filter(c => c.active).length
        const withAccount = customers.filter(c => c.profile_id).length
        const manual = total - withAccount
        const now = new Date()
        const newThisMonth = customers.filter(c => {
            const d = new Date(c.joined_at)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        }).length
        return { total, active, withAccount, manual, newThisMonth }
    }, [customers])

    const filtered = useMemo(() => {
        let list = customers
        if (statusFilter === 'active') list = list.filter(c => c.active)
        else if (statusFilter === 'withAccount') list = list.filter(c => c.profile_id)

        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.cpf?.includes(q) ||
            c.phone?.includes(q)
        )
    }, [customers, search, statusFilter])

    // ── Fecha o dialog de criação e limpa tudo ──
    const resetCreateForm = () => {
        setCpfInput('')
        setNameInput('')
        setEmailInput('')
        setPhoneInput('')
        setCpfCheckState('idle')
        setFoundProfile(null)
        pendingSubmitRef.current = null
    }

    // ── Verifica CPF no onBlur ──
    const handleCpfBlur = async () => {
        if (!cpfInput || !isValidCpf(cpfInput)) {
            if (cpfInput && !isValidCpf(cpfInput)) {
                toast.error('CPF deve ter 11 dígitos.')
            }
            return
        }

        setCpfCheckState('checking')
        const result = await checkCpfStatus(cpfInput)

        if (result.error) {
            toast.error(result.error)
            setCpfCheckState('idle')
            return
        }

        if (result.isMember) {
            setCpfCheckState('member')
            return
        }

        if (result.data) {
            setCpfCheckState('found')
            setFoundProfile(result.data as FoundProfile)
            setNameInput(result.data.name ?? '')
            setEmailInput(result.data.email ?? '')
        } else {
            setCpfCheckState('not-found')
            setFoundProfile(null)
        }
    }

    // ── Submit do formulário de criação ──
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (cpfCheckState === 'checking' || cpfCheckState === 'member') return

        const formData = new FormData(e.currentTarget)

        if (cpfCheckState === 'found' && foundProfile) {
            pendingSubmitRef.current = formData
            setShowConfirmLink(true)
            return
        }

        await submitCreateCustomer(formData)
    }

    const submitCreateCustomer = async (formData: FormData) => {
        setLoading(true)
        const result = await createCustomer(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            const linked = 'linked' in result && result.linked
            toast.success(linked
                ? '✓ Usuário da plataforma vinculado ao clube!'
                : '✓ Pré-cadastro criado! Cliente pode ativar a conta pelo app.')
            setOpenCreate(false)
            resetCreateForm()
            if (result.data) {
                // Refetch implícito via revalidatePath no server — recarrega a página
                // para obter o cliente com o profile populado via JOIN
                window.location.reload()
            }
        }
        setLoading(false)
    }

    const handleConfirmLink = async () => {
        setShowConfirmLink(false)
        if (pendingSubmitRef.current) {
            await submitCreateCustomer(pendingSubmitRef.current)
            pendingSubmitRef.current = null
        }
    }

    // ── Submit do formulário de edição ──
    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingCustomer) return
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const result = await updateCustomer(editingCustomer.id, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Cliente atualizado com sucesso!')
            setEditingCustomer(null)
            window.location.reload()
        }
        setLoading(false)
    }

    const handleToggleActive = async (customer: Customer) => {
        const result = await toggleCustomerActive(customer.id, !customer.active)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(customer.active ? 'Cliente inativado.' : 'Cliente ativado.')
            setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, active: !c.active } : c))
        }
    }

    const fieldsLocked = cpfCheckState === 'idle' || cpfCheckState === 'checking' || cpfCheckState === 'member'
    const isPreRegistered = (c: Customer) => c.profile?.status === 'pre_registered'

    return (
        <div className="space-y-6">

            {/* ── Popup de Confirmação de Vínculo ── */}
            <AlertDialog open={showConfirmLink} onOpenChange={setShowConfirmLink}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vincular cliente ao clube?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>Encontramos um cadastro na plataforma com esse CPF:</p>
                                <div className="rounded-md border bg-muted p-3 text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Nome:</span> <strong>{foundProfile?.name || '—'}</strong></p>
                                    <p><span className="text-muted-foreground">E-mail:</span> <strong>{foundProfile?.email}</strong></p>
                                    {foundProfile?.status === 'pre_registered' && (
                                        <Badge variant="secondary" className="mt-1">Pré-cadastrado</Badge>
                                    )}
                                </div>
                                <p>Deseja associar este cliente ao seu clube?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => pendingSubmitRef.current = null}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmLink}>
                            Sim, vincular ao clube
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Header da página ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie os vínculos de clientes do clube.</p>
                </div>

                {/* ── Dialog: Novo Cliente ── */}
                <Dialog
                    open={openCreate}
                    onOpenChange={(o) => {
                        setOpenCreate(o)
                        if (!o) resetCreateForm()
                    }}
                >
                    <DialogTrigger asChild>
                        <Button disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Vincular ou Cadastrar Cliente</DialogTitle>
                            <DialogDescription>
                                Informe o CPF do cliente. Se ele já estiver na plataforma, o sistema localizará e criará o vínculo. Caso contrário, um pré-cadastro será gerado.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreate} className="space-y-4">

                            {/* CPF */}
                            <div className="space-y-2">
                                <Label htmlFor="create-cpf">
                                    CPF <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="create-cpf"
                                        name="cpf"
                                        placeholder="000.000.000-00"
                                        value={cpfInput}
                                        onChange={(e) => {
                                            const formatted = formatCpf(e.target.value)
                                            setCpfInput(formatted)
                                            if (cpfCheckState !== 'idle') setCpfCheckState('idle')
                                        }}
                                        onBlur={handleCpfBlur}
                                        required
                                        className={
                                            cpfCheckState === 'found' ? 'border-green-500 focus-visible:ring-green-500' :
                                            cpfCheckState === 'member' ? 'border-destructive focus-visible:ring-destructive' :
                                            ''
                                        }
                                    />
                                    {cpfCheckState === 'checking' && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Feedback do status do CPF */}
                            {cpfCheckState === 'member' && (
                                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>Este CPF já está vinculado como cliente deste clube.</span>
                                </div>
                            )}
                            {cpfCheckState === 'found' && foundProfile && (
                                <div className="flex items-start gap-2 rounded-md border border-green-500/50 bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
                                    <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                    <span>
                                        Cliente encontrado: <strong>{foundProfile.name}</strong>. Confirme para vincular ao clube.
                                    </span>
                                </div>
                            )}
                            {cpfCheckState === 'not-found' && (
                                <div className="flex items-start gap-2 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>CPF não encontrado na plataforma. Preencha os dados abaixo para criar um pré-cadastro.</span>
                                </div>
                            )}

                            {/* Demais campos */}
                            <div className="space-y-2">
                                <Label htmlFor="create-name">Nome <span className="text-destructive">*</span></Label>
                                <Input
                                    id="create-name"
                                    name="name"
                                    placeholder="João Silva"
                                    required
                                    disabled={fieldsLocked}
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-email">E-mail <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="create-email"
                                        name="email"
                                        type="email"
                                        placeholder="joao@email.com"
                                        required
                                        disabled={fieldsLocked || cpfCheckState === 'found'}
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-phone">Telefone</Label>
                                    <Input
                                        id="create-phone"
                                        name="phone"
                                        placeholder="(11) 99999-9999"
                                        disabled={fieldsLocked}
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-notes">Observações internas</Label>
                                <Textarea
                                    id="create-notes"
                                    name="notes"
                                    placeholder="Anotações visíveis apenas para o clube..."
                                    rows={2}
                                    disabled={fieldsLocked}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        cpfCheckState === 'checking' ||
                                        cpfCheckState === 'member' ||
                                        cpfCheckState === 'idle' ||
                                        !cpfInput
                                    }
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : cpfCheckState === 'found' ? (
                                        'Confirmar Vínculo'
                                    ) : (
                                        'Criar Pré-cadastro'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <SummaryBar
                hero={{
                    label: "Total de Clientes",
                    value: String(metrics.total),
                    suffix: `${metrics.active} ativos`,
                    icon: Users,
                }}
                items={[
                    {
                        label: "Com Conta",
                        value: String(metrics.withAccount),
                        suffix: metrics.total > 0 ? `${Math.round((metrics.withAccount / metrics.total) * 100)}%` : undefined,
                        icon: LinkIcon,
                        iconClassName: "text-primary",
                        iconBgClassName: "bg-blue-50",
                    },
                    {
                        label: "Cadastro Manual",
                        value: String(metrics.manual),
                        icon: UserPen,
                        iconClassName: "text-slate-500",
                        iconBgClassName: "bg-slate-100",
                    },
                    {
                        label: "Novos no Mês",
                        value: String(metrics.newThisMonth),
                        icon: UserPlus,
                        iconClassName: "text-emerald-600",
                        iconBgClassName: "bg-emerald-50",
                    },
                ]}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <CardTitle>Lista de Clientes</CardTitle>
                            <div className="inline-flex items-center bg-muted rounded-lg p-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    Todos {metrics.total}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'active' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    Ativos {metrics.active}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('withAccount')}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === 'withAccount' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                                >
                                    Com conta {metrics.withAccount}
                                </button>
                            </div>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Nome, email ou CPF..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Conta</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cliente desde</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                        {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente vinculado.'}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((customer) => (
                                <CustomerRow
                                    key={customer.id}
                                    customer={customer}
                                    isReadOnly={isReadOnly}
                                    onEdit={(c) => {
                                        setEditingCustomer(c)
                                        setEditPhone(c.phone || '')
                                    }}
                                    onToggleActive={handleToggleActive}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Dialog: Editar Cliente ── */}
            <Dialog open={!!editingCustomer} onOpenChange={(o) => { if (!o) setEditingCustomer(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Vínculo de Cliente</DialogTitle>
                        <DialogDescription>
                            {isPreRegistered(editingCustomer!)
                                ? 'Conta pré-cadastrada. Você pode editar nome, e-mail e telefone. CPF é imutável.'
                                : 'Este cliente possui conta ativa. Apenas observações internas podem ser editadas pelo clube.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingCustomer && (
                        <form onSubmit={handleUpdate} className="space-y-4">

                            {/* Nome */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={editingCustomer.profile?.name ?? ''}
                                    disabled={!isPreRegistered(editingCustomer)}
                                    className={!isPreRegistered(editingCustomer) ? 'bg-muted' : ''}
                                />
                            </div>

                            {/* E-mail */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">E-mail</Label>
                                <Input
                                    id="edit-email"
                                    name="email"
                                    type="email"
                                    defaultValue={editingCustomer.profile?.email ?? ''}
                                    disabled={!isPreRegistered(editingCustomer)}
                                    className={!isPreRegistered(editingCustomer) ? 'bg-muted' : ''}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Telefone */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">Telefone</Label>
                                    <Input
                                        id="edit-phone"
                                        name="phone"
                                        placeholder="(11) 99999-9999"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                                        disabled={!isPreRegistered(editingCustomer)}
                                        className={!isPreRegistered(editingCustomer) ? 'bg-muted' : ''}
                                    />
                                </div>

                                {/* CPF — sempre bloqueado */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-cpf" className="flex items-center gap-1">
                                        CPF <Lock className="h-3 w-3 text-muted-foreground" />
                                    </Label>
                                    <Input
                                        id="edit-cpf"
                                        value={editingCustomer.profile?.cpf ?? '—'}
                                        disabled
                                        className="bg-muted font-mono"
                                    />
                                </div>
                            </div>

                            {/* Notes — sempre editável */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-notes">Observações internas</Label>
                                <Textarea
                                    id="edit-notes"
                                    name="notes"
                                    defaultValue={editingCustomer.notes ?? ''}
                                    placeholder="Anotações visíveis apenas para o clube..."
                                    rows={2}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
