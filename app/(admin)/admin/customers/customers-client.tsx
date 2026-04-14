'use client'

import { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createCustomer, updateCustomer, toggleCustomerActive } from "@/app/actions/customers"
import { toast } from "sonner"
import { Plus, Pencil, UserCheck, UserX, Search, Link as LinkIcon } from "lucide-react"

interface Customer {
    id: string
    profile_id: string | null  // null = cadastro manual pelo clube
    name: string
    email: string | null
    phone: string | null
    cpf: string | null
    notes: string | null
    active: boolean
    joined_at: string
    profile?: {
        id: string
        name: string
        email: string
        phone: string | null
        cpf: string | null
        avatar_url: string | null
    } | null
}

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

export default function CustomersClient({ customers: initialCustomers }: { customers: Customer[] }) {
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
    const [openCreate, setOpenCreate] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const [cpfInput, setCpfInput] = useState('')
    const [phoneInput, setPhoneInput] = useState('')
    const [editCpf, setEditCpf] = useState('')
    const [editPhone, setEditPhone] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return customers
        const q = search.toLowerCase()
        return customers.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.cpf?.includes(q) ||
            c.phone?.includes(q)
        )
    }, [customers, search])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const result = await createCustomer(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            const msg = 'linked' in result && result.linked
                ? '✓ Usuário do sistema vinculado como cliente!'
                : 'Cliente cadastrado com sucesso!'
            toast.success(msg)
            setOpenCreate(false)
            setCpfInput('')
            setPhoneInput('')
            if (result.data) setCustomers(prev => [...prev, result.data as Customer].sort((a, b) => a.name.localeCompare(b.name)))
        }
        setLoading(false)
    }

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
            if (result.data) {
                setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? result.data as Customer : c))
            }
            setEditingCustomer(null)
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie os vínculos de clientes do clube.</p>
                </div>

                <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) { setCpfInput(''); setPhoneInput('') } }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Vincular Cliente</DialogTitle>
                            <DialogDescription>
                                Se o cliente já tiver conta no sistema, será vinculado automaticamente pelo CPF ou email.
                                Caso contrário, será criado um cadastro manual para o clube.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-name">Nome <span className="text-destructive">*</span></Label>
                                <Input id="create-name" name="name" placeholder="João Silva" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input id="create-email" name="email" type="email" placeholder="joao@email.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-cpf">CPF / Documento</Label>
                                    <Input
                                        id="create-cpf"
                                        name="cpf"
                                        placeholder="000.000.000-00"
                                        value={cpfInput}
                                        onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-phone">Telefone</Label>
                                    <Input
                                        id="create-phone"
                                        name="phone"
                                        placeholder="(11) 99999-9999"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-notes">Observações internas</Label>
                                <Textarea id="create-notes" name="notes" placeholder="Anotações visíveis apenas para o clube..." rows={2} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Salvando...' : 'Vincular Cliente'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle>Lista de Clientes <span className="text-muted-foreground font-normal text-sm">({customers.length})</span></CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou CPF..."
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
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>CPF / Doc.</TableHead>
                                <TableHead>Conta</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Vínculo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                                        {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente vinculado.'}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell className="text-sm">{customer.email || '—'}</TableCell>
                                    <TableCell className="text-sm">{customer.phone || '—'}</TableCell>
                                    <TableCell className="text-sm font-mono">{customer.cpf || '—'}</TableCell>
                                    <TableCell>
                                        {customer.profile_id ? (
                                            <Badge variant="default" className="gap-1">
                                                <LinkIcon className="h-3 w-3" />
                                                Com conta
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Manual</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={customer.active ? 'default' : 'outline'}>
                                            {customer.active ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(customer.joined_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditingCustomer(customer)
                                                setEditCpf(customer.cpf || '')
                                                setEditPhone(customer.phone || '')
                                            }}
                                            title="Editar vínculo"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleActive(customer)}
                                            title={customer.active ? 'Inativar cliente' : 'Ativar cliente'}
                                        >
                                            {customer.active
                                                ? <UserX className="h-4 w-4 text-destructive" />
                                                : <UserCheck className="h-4 w-4 text-green-600" />
                                            }
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog Editar */}
            <Dialog open={!!editingCustomer} onOpenChange={(o) => { if (!o) setEditingCustomer(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Vínculo de Cliente</DialogTitle>
                        <DialogDescription>
                            {editingCustomer?.profile_id
                                ? 'Este cliente possui conta no sistema. Apenas as observações internas e telefone podem ser editados pelo clube.'
                                : 'Atualize os dados do cadastro manual deste cliente no clube.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingCustomer && (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome <span className="text-destructive">*</span></Label>
                                <Input id="edit-name" name="name" defaultValue={editingCustomer.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                {editingCustomer.profile_id ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="edit-email"
                                            name="email"
                                            value={editingCustomer.profile?.email || editingCustomer.email || ''}
                                            disabled
                                            className="bg-muted"
                                        />
                                        <Badge variant="default" className="shrink-0 gap-1">
                                            <LinkIcon className="h-3 w-3" />
                                            Com conta
                                        </Badge>
                                    </div>
                                ) : (
                                    <Input id="edit-email" name="email" type="email" defaultValue={editingCustomer.email ?? ''} />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-cpf">CPF / Documento</Label>
                                    <Input
                                        id="edit-cpf"
                                        name="cpf"
                                        placeholder="000.000.000-00"
                                        value={editCpf}
                                        onChange={(e) => setEditCpf(formatCpf(e.target.value))}
                                        disabled={!!editingCustomer.profile_id}
                                        className={editingCustomer.profile_id ? 'bg-muted' : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phone">Telefone</Label>
                                    <Input
                                        id="edit-phone"
                                        name="phone"
                                        placeholder="(11) 99999-9999"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                                    />
                                </div>
                            </div>
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
