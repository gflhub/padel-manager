'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, LayoutGrid, Table } from "lucide-react"
import { createComanda } from "@/app/actions/comandas"
import { toast } from "sonner"
import ComandasCards from "./comandas-cards"
import AdminComandasClient from "./comandas-client"

interface Comanda {
    id: string
    customer_name: string
    status: string
    items_count: number
    total_amount: number
    opened_at: string
}

interface Product {
    id: string
    name: string
    category: string
    price: number
}

export default function ComandasWrapper({ comandas: initialComandas, products }: { comandas: Comanda[]; products: Product[] }) {
    const [comandas, setComandas] = useState(initialComandas)
    const [openCreate, setOpenCreate] = useState(false)
    const [loading, setLoading] = useState(false)
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

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
            // Reset form
            e.currentTarget.reset()
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Comandas</h1>
                    <p className="text-muted-foreground">Gerencie comandas dos clientes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'cards' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('cards')}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Cards
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                        >
                            <Table className="h-4 w-4 mr-2" />
                            Tabela
                        </Button>
                    </div>
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Comanda
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Abrir Comanda</DialogTitle>
                                <DialogDescription>Dados do cliente.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customer_name">Nome do Cliente</Label>
                                    <Input id="customer_name" name="customer_name" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer_phone">Telefone</Label>
                                    <Input id="customer_phone" name="customer_phone" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer_cpf">CPF</Label>
                                    <Input id="customer_cpf" name="customer_cpf" />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Abrindo...' : 'Abrir Comanda'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {viewMode === 'cards' ? (
                <ComandasCards comandas={comandas} products={products} />
            ) : (
                <AdminComandasClient comandas={comandas} products={products} />
            )}
        </div>
    )
}
