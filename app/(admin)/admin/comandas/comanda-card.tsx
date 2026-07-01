'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TonalBadge } from "@/components/ui/tonal-badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { addComandaItem, closeComanda, getComandaWithItems, associateCustomerToComanda } from "@/app/actions/comandas"
import { updateComandaItemQuantity, cancelComanda } from "@/app/actions/comandas"
import { CustomerCombobox } from "@/components/customer-combobox"
import { toast } from "sonner"
import { Plus, CreditCard, Search, Trash2, Clock, UserPlus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getInitials, formatElapsedTime } from "@/lib/format-helpers"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"
import { ComandaItemRow } from "./comanda-item-row"

export interface ComandaItem {
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

export interface Comanda {
    id: string
    customer_name: string
    status: string
    items_count: number
    total_amount: number
    opened_at: string
    customerProfileId: string | null
    items?: ComandaItem[]
}

export interface Product {
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

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-violet-100 text-violet-700',
    'bg-orange-100 text-orange-700',
]

function getAvatarColors(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function ComandaCard({ comanda, products, onUpdate, isReadOnly = false }: { comanda: Comanda; products: Product[]; onUpdate: () => void; isReadOnly?: boolean }) {
    const [items, setItems] = useState<ComandaItem[]>(comanda.items || [])
    const [openAddProduct, setOpenAddProduct] = useState(false)
    const [openClose, setOpenClose] = useState(false)
    const [openCancel, setOpenCancel] = useState(false)
    const [openAssociate, setOpenAssociate] = useState(false)
    const [associateId, setAssociateId] = useState<string | null>(null)
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

    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)
    const avatarColors = getAvatarColors(comanda.customer_name)

    return (
        <>
            <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className={`${avatarColors} text-sm font-semibold`}>
                                {getInitials(comanda.customer_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-bold truncate">{comanda.customer_name}</h3>
                                <TonalBadge color="emerald" className="shrink-0">Aberta</TonalBadge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatElapsedTime(new Date(comanda.opened_at))}
                                </span>
                                <span className="text-border">·</span>
                                <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                    {/* Valor Total + ação rápida */}
                    <div className="bg-primary/[0.08] rounded-lg p-3 mb-3 flex items-end justify-between gap-2">
                        <div>
                            <div className="text-xs text-muted-foreground">Total da comanda</div>
                            <div className="text-2xl font-extrabold text-primary tracking-tight">
                                {formatCurrency(totalAmount)}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setOpenAddProduct(true)}
                            disabled={isReadOnly}
                            title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                            className="h-8 px-3 text-xs font-semibold shadow-sm shrink-0"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Item
                        </Button>
                    </div>

                    {/* Lista de Itens */}
                    <ScrollArea className="h-[280px]">
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                Nenhum item adicionado
                            </div>
                        ) : (
                            <div className="-mx-1 pr-3">
                                {items.map((item, index) => (
                                    <div key={item.id}>
                                        {index > 0 && <div className="h-px bg-border/60 mx-1" />}
                                        <ComandaItemRow
                                            item={item}
                                            products={products}
                                            onQuantityChange={handleQuantityChange}
                                            formatCurrency={formatCurrency}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>

                <CardFooter className="flex items-center gap-2 pt-3 border-t">
                    <Button
                        className="flex-1 h-10 font-semibold shadow-sm"
                        onClick={() => setOpenClose(true)}
                        disabled={items.length === 0 || isReadOnly}
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Fechar Comanda
                    </Button>
                    {comanda.customerProfileId === null && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground"
                            title="Associar cliente"
                            onClick={() => setOpenAssociate(true)}
                            disabled={isReadOnly}
                        >
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : "Cancelar comanda"}
                        onClick={() => setOpenCancel(true)}
                        disabled={isReadOnly}
                    >
                        <Trash2 className="h-4 w-4" />
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

            {/* Dialog de associar cliente */}
            <Dialog open={openAssociate} onOpenChange={setOpenAssociate}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Associar Cliente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <CustomerCombobox
                            value={associateId}
                            onChange={(id) => setAssociateId(id)}
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenAssociate(false)}>
                                Cancelar
                            </Button>
                            <Button
                                disabled={!associateId || loading}
                                onClick={async () => {
                                    setLoading(true)
                                    const result = await associateCustomerToComanda(comanda.id, associateId!)
                                    if (result.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success('Cliente associado!')
                                        setOpenAssociate(false)
                                        onUpdate()
                                    }
                                    setLoading(false)
                                }}
                            >
                                Confirmar
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
