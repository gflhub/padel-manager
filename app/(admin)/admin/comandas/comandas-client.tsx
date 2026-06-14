'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createComanda, addComandaItem, closeComanda, getComandaWithItems, closeMultipleComandas } from "@/app/actions/comandas"
import { toast } from "sonner"
import { Plus, Eye, CreditCard } from "lucide-react"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

interface Comanda {
    id: string
    customer_name: string
    status: string
    items_count: number
    total_amount: number
    opened_at: string
    items?: Array<{
        id: string
        item_type: string
        product_details: { product_name: string; quantity: number; unit_price: number } | null
        total_price: number
    }>
}

interface Product {
    id: string
    name: string
    category: string
    price: number
}

export default function AdminComandasClient({ comandas: initialComandas, products, isReadOnly = false }: { comandas: Comanda[]; products: Product[]; isReadOnly?: boolean }) {
    const [comandas, setComandas] = useState(initialComandas)
    const [openCreate, setOpenCreate] = useState(false)
    const [viewingComanda, setViewingComanda] = useState<Comanda | null>(null)
    const [openAddProduct, setOpenAddProduct] = useState(false)
    const [openClose, setOpenClose] = useState(false)
    const [openCloseMultiple, setOpenCloseMultiple] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState('pix')
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const result = await createComanda(formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Comanda aberta!')
            setOpenCreate(false)
            if (result.data) setComandas(prev => [result.data as Comanda, ...prev])
        }
        setLoading(false)
    }

    const handleView = async (comanda: Comanda) => {
        const { data, error } = await getComandaWithItems(comanda.id)
        if (error) { toast.error(error); return }
        setViewingComanda(data as Comanda)
    }

    const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!viewingComanda) return
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const productId = formData.get('product_id') as string
        const product = products.find(p => p.id === productId)
        if (product) {
            formData.set('product_name', product.name)
            formData.set('category', product.category)
            formData.set('unit_price', String(product.price))
            formData.set('item_type', 'product')
        }
        const result = await addComandaItem(viewingComanda.id, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Produto adicionado!')
            setOpenAddProduct(false)
            handleView(viewingComanda)
        }
        setLoading(false)
    }

    const handleClose = async () => {
        if (!viewingComanda) return
        setLoading(true)
        const result = await closeComanda(viewingComanda.id, selectedPayment)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Comanda fechada!')
            setOpenClose(false)
            setViewingComanda(null)
            setComandas(prev => prev.map(c => c.id === viewingComanda.id ? { ...c, status: 'closed' } : c))
        }
        setLoading(false)
    }

    const handleCloseMultiple = async () => {
        if (selectedIds.length === 0) return
        setLoading(true)
        const result = await closeMultipleComandas(selectedIds, selectedPayment)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`${selectedIds.length} comandas fechadas!`)
            setOpenCloseMultiple(false)
            setComandas(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, status: 'closed' } : c))
            setSelectedIds([])
        }
        setLoading(false)
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        const openIds = openComandas.map(c => c.id)
        if (selectedIds.length === openIds.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(openIds)
        }
    }

    const statusLabels: Record<string, string> = { open: 'Aberta', closed: 'Fechada', cancelled: 'Cancelada' }
    const statusVariant = (s: string) => s === 'open' ? 'default' as const : s === 'closed' ? 'secondary' as const : 'outline' as const

    const openComandas = comandas.filter(c => c.status === 'open')
    const closedComandas = comandas.filter(c => c.status !== 'open')
    
    const selectedTotal = openComandas
        .filter(c => selectedIds.includes(c.id))
        .reduce((sum, c) => sum + c.total_amount, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Comandas</h1>
                    <p className="text-muted-foreground">Gerencie comandas dos clientes.</p>
                </div>
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogTrigger asChild><Button disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}><Plus className="mr-2 h-4 w-4" /> Nova Comanda</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Abrir Comanda</DialogTitle><DialogDescription>Dados do cliente.</DialogDescription></DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="customer_name">Nome do Cliente</Label><Input id="customer_name" name="customer_name" required /></div>
                            <div className="space-y-2"><Label htmlFor="customer_phone">Telefone</Label><Input id="customer_phone" name="customer_phone" /></div>
                            <div className="space-y-2"><Label htmlFor="customer_cpf">CPF</Label><Input id="customer_cpf" name="customer_cpf" /></div>
                            <DialogFooter><Button type="submit" disabled={loading}>{loading ? 'Abrindo...' : 'Abrir Comanda'}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="open">
                <TabsList>
                    <TabsTrigger value="open">Abertas ({openComandas.length})</TabsTrigger>
                    <TabsTrigger value="closed">Fechadas ({closedComandas.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="open">
                    <Card><CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center">
                                            {selectedIds.length === openComandas.length && openComandas.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                        </button>
                                    </TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Itens</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Desde</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {openComandas.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma comanda aberta.</TableCell></TableRow>
                                ) : openComandas.map(c => (
                                    <TableRow key={c.id} className={selectedIds.includes(c.id) ? "bg-muted/50" : ""}>
                                        <TableCell>
                                            <button onClick={() => toggleSelect(c.id)} className="flex items-center justify-center">
                                                {selectedIds.includes(c.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                            </button>
                                        </TableCell>
                                        <TableCell className="font-medium">{c.customer_name}</TableCell>
                                        <TableCell>{c.items_count}</TableCell>
                                        <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_amount)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{new Date(c.opened_at).toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleView(c)}><Eye className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="closed">
                    <Card><CardContent className="pt-6">
                        <Table>
                            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {closedComandas.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma comanda fechada.</TableCell></TableRow>
                                ) : closedComandas.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.customer_name}</TableCell>
                                        <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_amount)}</TableCell>
                                        <TableCell><Badge variant={statusVariant(c.status)}>{statusLabels[c.status]}</Badge></TableCell>
                                        <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleView(c)}><Eye className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>
            </Tabs>

            {/* View Dialog */}
            <Dialog open={!!viewingComanda} onOpenChange={(o) => { if (!o) setViewingComanda(null) }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Comanda - {viewingComanda?.customer_name}</DialogTitle></DialogHeader>
                    {viewingComanda && (
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Badge variant={statusVariant(viewingComanda.status)}>{statusLabels[viewingComanda.status]}</Badge>
                                <span className="text-xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingComanda.total_amount)}</span>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qtd</TableHead><TableHead>Unitário</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {viewingComanda.items?.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.product_details?.product_name || item.item_type}</TableCell>
                                            <TableCell>{item.product_details?.quantity || 1}</TableCell>
                                            <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product_details?.unit_price || item.total_price)}</TableCell>
                                            <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {viewingComanda.status === 'open' && (
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setOpenAddProduct(true)} disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}><Plus className="mr-2 h-4 w-4" />Adicionar Produto</Button>
                                    <Button onClick={() => setOpenClose(true)} disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}><CreditCard className="mr-2 h-4 w-4" />Fechar Comanda</Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add Product Dialog */}
            <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar Produto</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Produto</Label>
                            <Select name="product_id" required>
                                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Quantidade</Label><Input name="quantity" type="number" defaultValue={1} min={1} /></div>
                        <DialogFooter><Button type="submit" disabled={loading}>{loading ? 'Adicionando...' : 'Adicionar'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Close Comanda Dialog */}
            <Dialog open={openClose} onOpenChange={setOpenClose}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Fechar Comanda</DialogTitle><DialogDescription>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingComanda?.total_amount || 0)}</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="card">Cartão</SelectItem>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter><Button onClick={handleClose} disabled={loading}>{loading ? 'Fechando...' : 'Confirmar Pagamento'}</Button></DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Close Multiple Comandas Dialog */}
            <Dialog open={openCloseMultiple} onOpenChange={setOpenCloseMultiple}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Fechar {selectedIds.length} Comandas</DialogTitle><DialogDescription>Total acumulado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTotal)}</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Forma de Pagamento (Geral)</Label>
                            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="card">Cartão</SelectItem>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter><Button onClick={handleCloseMultiple} disabled={loading}>{loading ? 'Fechando...' : 'Confirmar Pagamento Geral'}</Button></DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
