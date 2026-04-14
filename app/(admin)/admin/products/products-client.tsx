'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface Product {
    id: string
    name: string
    category: string
    price: number
    stock: number
    active: boolean
}

const categoryLabels: Record<string, string> = { bebidas: 'Bebidas', lanches: 'Lanches', doces: 'Doces', outros: 'Outros' }
const categories = ['bebidas', 'lanches', 'doces', 'outros']

function ProductForm({ product, onSubmit, loading }: { product?: Product; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; loading: boolean }) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input name="name" defaultValue={product?.name} required /></div>
            <div className="space-y-2">
                <Label>Categoria</Label>
                <Select name="category" defaultValue={product?.category || 'bebidas'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Preço (R$)</Label><Input name="price" type="number" step="0.01" defaultValue={product?.price || 0} min={0} required /></div>
                <div className="space-y-2"><Label>Estoque</Label><Input name="stock" type="number" defaultValue={product?.stock || 0} min={0} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading}>{loading ? 'Salvando...' : product ? 'Atualizar' : 'Criar'}</Button></DialogFooter>
        </form>
    )
}

export default function AdminProductsClient({ products: initialProducts }: { products: Product[] }) {
    const [products, setProducts] = useState(initialProducts)
    const [openCreate, setOpenCreate] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(false)

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set('active', 'true')
        const result = await createProduct(formData)
        if (result.error) { toast.error(result.error) } else {
            toast.success('Produto criado!')
            setOpenCreate(false)
            if (result.data) setProducts(prev => [...prev, result.data as Product])
        }
        setLoading(false)
    }

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingProduct) return
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set('active', editingProduct.active ? 'true' : 'false')
        const result = await updateProduct(editingProduct.id, formData)
        if (result.error) { toast.error(result.error) } else {
            toast.success('Produto atualizado!')
            setEditingProduct(null)
            if (result.data) setProducts(prev => prev.map(p => p.id === editingProduct.id ? result.data as Product : p))
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este produto?')) return
        const result = await deleteProduct(id)
        if (result.error) { toast.error(result.error) } else {
            toast.success('Produto excluído!')
            setProducts(prev => prev.filter(p => p.id !== id))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
                    <p className="text-muted-foreground">Catálogo de produtos do bar.</p>
                </div>
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Produto</Button></DialogTrigger>
                    <DialogContent><DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader><ProductForm onSubmit={handleCreate} loading={loading} /></DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all">
                <TabsList>
                    <TabsTrigger value="all">Todos ({products.length})</TabsTrigger>
                    {categories.map(cat => {
                        const count = products.filter(p => p.category === cat).length
                        return count > 0 ? <TabsTrigger key={cat} value={cat}>{categoryLabels[cat]} ({count})</TabsTrigger> : null
                    })}
                </TabsList>
                {['all', ...categories].map(tab => (
                    <TabsContent key={tab} value={tab}>
                        <Card><CardContent className="pt-6">
                            <Table>
                                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {products.filter(p => tab === 'all' || p.category === tab).length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum produto.</TableCell></TableRow>
                                    ) : products.filter(p => tab === 'all' || p.category === tab).map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{categoryLabels[p.category]}</Badge></TableCell>
                                            <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</TableCell>
                                            <TableCell>{p.stock}</TableCell>
                                            <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Disponível' : 'Indisponível'}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingProduct(p)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent></Card>
                    </TabsContent>
                ))}
            </Tabs>

            <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
                <DialogContent><DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>{editingProduct && <ProductForm product={editingProduct} onSubmit={handleUpdate} loading={loading} />}</DialogContent>
            </Dialog>
        </div>
    )
}
