import { getComandas } from "@/app/actions/comandas"
import { getProducts } from "@/app/actions/products"
import ComandasWrapper from "@/app/(admin)/admin/comandas/comandas-wrapper"

export default async function StaffComandasPage() {
    const [{ data: comandas }, { data: products }] = await Promise.all([
        getComandas(),
        getProducts(),
    ])
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Comandas</h1>
                <p className="text-muted-foreground mt-1">Gerencie as contas abertas do dia</p>
            </div>
            <ComandasWrapper comandas={comandas || []} products={products || []} />
        </div>
    )
}
