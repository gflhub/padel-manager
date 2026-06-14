'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ComandaCard, type Comanda, type Product } from "./comanda-card"

export default function ComandasCards({ comandas: initialComandas, products, isReadOnly = false }: { comandas: Comanda[]; products: Product[]; isReadOnly?: boolean }) {
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
                        isReadOnly={isReadOnly}
                    />
                ))
            )}
        </div>
    )
}
