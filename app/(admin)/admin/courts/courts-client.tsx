'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCourt, updateCourt, deleteCourt } from "@/app/actions/courts"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface Court {
    id: string
    name: string
    court_type: string
    price_per_slot: number
    duration_slot: number
    active: boolean
}

function CourtForm({ court, onSubmit, loading }: { court?: Court; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; loading: boolean }) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={court?.name} placeholder="Quadra 1" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="court_type">Tipo</Label>
                <Select name="court_type" defaultValue={court?.court_type || 'padel'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="padel">Padel</SelectItem>
                        <SelectItem value="tennis">Tênis</SelectItem>
                        <SelectItem value="beach_tennis">Beach Tennis</SelectItem>
                        <SelectItem value="volleyball">Vôlei</SelectItem>
                        <SelectItem value="futsal">Futsal</SelectItem>
                        <SelectItem value="squash">Squash</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price_per_slot">Preço (R$)</Label>
                    <Input id="price_per_slot" name="price_per_slot" type="number" step="0.01" defaultValue={court?.price_per_slot || 120} min={0} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="duration_slot">Duração (min)</Label>
                    <Input id="duration_slot" name="duration_slot" type="number" defaultValue={court?.duration_slot || 60} min={30} required />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : (court ? 'Atualizar' : 'Criar')}</Button>
            </DialogFooter>
        </form>
    )
}

export default function AdminCourtsPage({ courts: initialCourts }: { courts: Court[] }) {
    const [courts, setCourts] = useState<Court[]>(initialCourts)
    const [openCreate, setOpenCreate] = useState(false)
    const [editingCourt, setEditingCourt] = useState<Court | null>(null)
    const [loading, setLoading] = useState(false)

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set('active', 'true')
        const result = await createCourt(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Quadra criada com sucesso!')
            setOpenCreate(false)
            if (result.data) setCourts(prev => [...prev, result.data as Court])
        }
        setLoading(false)
    }

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingCourt) return
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set('active', editingCourt.active ? 'true' : 'false')
        const result = await updateCourt(editingCourt.id, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Quadra atualizada!')
            setEditingCourt(null)
            if (result.data) setCourts(prev => prev.map(c => c.id === editingCourt.id ? result.data as Court : c))
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta quadra?')) return
        const result = await deleteCourt(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Quadra excluída!')
            setCourts(prev => prev.filter(c => c.id !== id))
        }
    }

    const courtTypeLabels: Record<string, string> = {
        padel: 'Padel', tennis: 'Tênis', beach_tennis: 'Beach Tennis', volleyball: 'Vôlei', futsal: 'Futsal', squash: 'Squash', other: 'Outro',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quadras</h1>
                    <p className="text-muted-foreground">Gerencie as quadras do seu complexo.</p>
                </div>
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Nova Quadra</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Quadra</DialogTitle>
                            <DialogDescription>Preencha os dados da nova quadra.</DialogDescription>
                        </DialogHeader>
                        <CourtForm onSubmit={handleCreate} loading={loading} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader><CardTitle>Lista de Quadras</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Preço</TableHead>
                                <TableHead>Duração</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courts.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma quadra cadastrada.</TableCell></TableRow>
                            ) : courts.map((court) => (
                                <TableRow key={court.id}>
                                    <TableCell className="font-medium">{court.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{courtTypeLabels[court.court_type] || court.court_type}</Badge></TableCell>
                                    <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(court.price_per_slot)}</TableCell>
                                    <TableCell>{court.duration_slot} min</TableCell>
                                    <TableCell><Badge variant={court.active ? 'default' : 'secondary'}>{court.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingCourt(court)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(court.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!editingCourt} onOpenChange={(o) => !o && setEditingCourt(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Quadra</DialogTitle>
                        <DialogDescription>Atualize os dados da quadra.</DialogDescription>
                    </DialogHeader>
                    {editingCourt && <CourtForm court={editingCourt} onSubmit={handleUpdate} loading={loading} />}
                </DialogContent>
            </Dialog>
        </div>
    )
}
