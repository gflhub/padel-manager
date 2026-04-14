import { getComandas } from "@/app/actions/comandas"
import { getProducts } from "@/app/actions/products"
import ComandasWrapper from "./comandas-wrapper"

export default async function ComandasPage() {
    const [{ data: comandas }, { data: products }] = await Promise.all([
        getComandas(),
        getProducts(),
    ])
    return <ComandasWrapper comandas={comandas || []} products={products || []} />
}
