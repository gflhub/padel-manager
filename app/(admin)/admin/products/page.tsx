import { getProducts } from "@/app/actions/products"
import { getIsTrialReadOnly } from "@/lib/get-trial-readonly"
import AdminProductsClient from "./products-client"

export default async function ProductsPage() {
    const [{ data: products }, isReadOnly] = await Promise.all([
        getProducts(),
        getIsTrialReadOnly(),
    ])
    return <AdminProductsClient products={products || []} isReadOnly={isReadOnly} />
}
