'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { addComandaItem, closeComanda, getComandaWithItems } from "@/app/actions/comandas"
import { updateComandaItemQuantity, cancelComanda } from "@/app/actions/comandas-new"
import { toast } from "sonner"
import { Plus, Minus, CreditCard, Search, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ComandaItem {
    id: string
    item_type: string
    product_details: {
        product_id?: string
        product_name: string
    } | null
    unit_price: number
    quantity: number
    subtotal: number
    total_price: number
}

interface Comanda {
    id: string
    customer_name: string
    status: string
    items_count: number
    total_amount: number
    opened_at: string
    items?: ComandaItem[]
}

interface Product {
    id: string
    name: string
    category: string
    price: number
}

// Fila de operações pendentes para enviar à API
interface PendingOperation {
    type: 'add' | 'quantity'
    tempId?: string
    itemId?: string
    product?: Product
    newQuantity?: number
}

function ComandaCard({ comanda, products, onUpdate }: { comanda: Comanda; products: Product[]; onUpdate: () => void }) {
    const [items, setItems] = useState<ComandaItem[]>(comanda.items || [])
    const [openAddProduct, setOpenAddProduct] = useState(false)
    const [openClose, setOpenClose] = useState(false)
    const [openCancel, setOpenCancel] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState('pix')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const pendingOps = useRef<PendingOperation[]>([])
    const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tempIdCounter = useRef(0)

    const loadItems = useCallback(async () => {
        const { data, error } = await getComandaWithItems(comanda.id)
        if (!error && data) {
            setItems((data as Comanda).items || [])
        }
    }, [comanda.id])

    // Carregar itens ao montar
    useEffect(() => {
        loadItems()
    }, [loadItems])

    // Cleanup do timer ao desmontar
    useEffect(() => {
        return () => {
            if (syncTimer.current) clearTimeout(syncTimer.current)
        }
    }, [])

    // Agendar sync com a API após 2s de inatividade
    const scheduleSyncToApi = useCallback(() => {
        if (syncTimer.current) clearTimeout(syncTimer.current)
        syncTimer.current = setTimeout(async () => {
            const ops = [...pendingOps.current]
            pendingOps.current = []

            for (const op of ops) {
                if (op.type === 'add' && op.product) {
                    const formData = new FormData()
                    formData.set('product_id', op.product.id)
                    formData.set('product_name', op.product.name)
                    formData.set('category', op.product.category)
                    formData.set('unit_price', String(op.product.price))
                    formData.set('item_type', 'product')
                    formData.set('quantity', '1')
                    const result = await addComandaItem(comanda.id, formData)
                    if (result.error) {
                        toast.error(`Erro ao salvar: ${result.error}`)
                    }
                } else if (op.type === 'quantity' && op.itemId && op.newQuantity != null) {
                    // Só enviar para itens reais (não temporários)
                    if (!op.itemId.startsWith('temp-')) {
                        const result = await updateComandaItemQuantity(op.itemId, op.newQuantity)
                        if (result.error) {
                            toast.error(`Erro ao salvar: ${result.error}`)
                        }
                    }
                }
            }

            // Recarregar dados reais do servidor para sincronizar IDs
            await loadItems()
        }, 2000)
    }, [comanda.id, loadItems])

    // Produtos filtrados pela pesquisa
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const firstProduct = filteredProducts[0]

    // Focar no campo de pesquisa quando o modal abre
    useEffect(() => {
        if (openAddProduct) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }
    }, [openAddProduct])

    const handleAddProduct = (productId?: string) => {
        const product = productId
            ? products.find(p => p.id === productId)
            : firstProduct

        if (!product) {
            toast.error('Produto não encontrado')
            return
        }

        // Optimistic update: adicionar imediatamente na UI
        const tempId = `temp-${tempIdCounter.current++}`
        const newItem: ComandaItem = {
            id: tempId,
            item_type: 'product',
            product_details: {
                product_id: product.id,
                product_name: product.name,
            },
            unit_price: product.price,
            quantity: 1,
            subtotal: product.price,
            total_price: product.price,
        }

        setItems(prev => [...prev, newItem])
        setOpenAddProduct(false)
        setSearchTerm('')
        toast.success('Item adicionado!')

        // Adicionar à fila de operações pendentes
        pendingOps.current.push({ type: 'add', tempId, product })
        scheduleSyncToApi()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && firstProduct) {
            e.preventDefault()
            handleAddProduct()
        }
    }

    const handleQuantityChange = (itemId: string, delta: number) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const currentQty = item.quantity
        const newQuantity = currentQty + delta
        if (newQuantity < 1) return

        const unitPrice = item.unit_price || 0
        const newSubtotal = unitPrice * newQuantity

        // Optimistic update: atualizar imediatamente na UI
        setItems(prev => prev.map(i => {
            if (i.id !== itemId) return i
            return {
                ...i,
                quantity: newQuantity,
                subtotal: newSubtotal,
                total_price: newSubtotal,
            }
        }))

        // Remover operação de quantidade anterior para o mesmo item (debounce)
        pendingOps.current = pendingOps.current.filter(
            op => !(op.type === 'quantity' && op.itemId === itemId)
        )
        pendingOps.current.push({ type: 'quantity', itemId, newQuantity })
        scheduleSyncToApi()
    }

    const handleClose = async () => {
        if (loading) return // Prevenir cliques múltiplos

        setLoading(true)
        const result = await closeComanda(comanda.id, selectedPayment)
        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success('Comanda fechada!')
            setOpenClose(false)
            // Não resetar loading aqui - o card será removido
            onUpdate() // Isso removerá o card da lista
        }
    }

    const handleCancel = async () => {
        if (loading) return // Prevenir cliques múltiplos

        setLoading(true)
        const result = await cancelComanda(comanda.id)
        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success('Comanda cancelada!')
            setOpenCancel(false)
            // Não resetar loading aqui - o card será removido
            onUpdate() // Isso removerá o card da lista
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)

    return (
        <>
            <Card className="flex flex-col">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <CardTitle className="text-lg font-bold">
                                {comanda.customer_name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground mt-1">
                                {new Date(comanda.opened_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                        <Badge variant="default">Aberta</Badge>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                    {/* Valor Total */}
                    <div className="bg-primary/10 rounded-lg p-3 mb-3">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-2xl font-bold text-primary">
                            {formatCurrency(totalAmount)}
                        </div>
                    </div>

                    {/* Botão Adicionar */}
                    <Button
                        size="sm"
                        onClick={() => setOpenAddProduct(true)}
                        variant="outline"
                        className="w-full mb-3"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Item
                    </Button>

                    {/* Lista de Itens */}
                    <ScrollArea className="h-[280px]">
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                Nenhum item adicionado
                            </div>
                        ) : (
                            <div className="space-y-2 pr-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 p-2 rounded-lg border bg-card text-sm"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate text-xs">
                                                {item.product_details?.product_name || item.item_type}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatCurrency(item.unit_price || 0)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => handleQuantityChange(item.id, -1)}
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-6 text-center text-xs font-semibold">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-6 w-6"
                                                onClick={() => handleQuantityChange(item.id, 1)}
                                                disabled={false}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="font-bold text-xs min-w-[60px] text-right">
                                            {formatCurrency(item.total_price)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>

                <CardFooter className="flex-col gap-2 pt-3 border-t">
                    <Button
                        className="w-full"
                        onClick={() => setOpenClose(true)}
                        disabled={items.length === 0}
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Fechar Comanda
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setOpenCancel(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancelar
                    </Button>
                </CardFooter>
            </Card>

            {/* Modal de adicionar produto com pesquisa */}
            <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Item</DialogTitle>
                        <DialogDescription>
                            Pesquise e adicione itens à comanda
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Pesquisar produto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9"
                            />
                        </div>

                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {filteredProducts.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Nenhum produto encontrado
                                    </div>
                                ) : (
                                    filteredProducts.map((product, index) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleAddProduct(product.id)}
                                            disabled={false}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${index === 0
                                                ? 'bg-primary/10 border-primary shadow-sm'
                                                : 'bg-card hover:bg-accent'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-sm text-muted-foreground">{product.category}</div>
                                                </div>
                                                <div className="font-bold">{formatCurrency(product.price)}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        <div className="text-xs text-muted-foreground text-center">
                            {firstProduct && 'Pressione Enter para adicionar o primeiro item'}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de fechar comanda */}
            <Dialog open={openClose} onOpenChange={setOpenClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fechar Comanda</DialogTitle>
                        <DialogDescription>
                            Total a pagar: {formatCurrency(totalAmount)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Forma de Pagamento</label>
                            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="card">Cartão</SelectItem>
                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenClose(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleClose} disabled={loading}>
                                {loading ? 'Processando...' : 'Confirmar Pagamento'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Alert Dialog de cancelamento */}
            <AlertDialog open={openCancel} onOpenChange={setOpenCancel}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Comanda?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os itens da comanda serão removidos e a comanda será cancelada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {loading ? 'Cancelando...' : 'Sim, Cancelar Comanda'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default function ComandasCards({ comandas: initialComandas, products }: { comandas: Comanda[]; products: Product[] }) {
    const router = useRouter()
    const [comandas, setComandas] = useState(initialComandas)
    const [refreshKey, setRefreshKey] = useState(0)

    // Atualizar state quando props mudam
    useEffect(() => {
        setComandas(initialComandas)
    }, [initialComandas])

    const openComandas = comandas.filter(c => c.status === 'open')

    const handleUpdate = async () => {
        // Recarregar dados do servidor
        router.refresh()
        // Atualizar o refresh key para forçar re-render
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {openComandas.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    <p className="text-lg">Nenhuma comanda aberta</p>
                </div>
            ) : (
                openComandas.map((comanda) => (
                    <ComandaCard
                        key={`${comanda.id}-${refreshKey}`}
                        comanda={comanda}
                        products={products}
                        onUpdate={handleUpdate}
                    />
                ))
            )}
        </div>
    )
}
