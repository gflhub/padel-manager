import { getProducts } from "@/app/actions/products"
import AdminProductsClient from "./products-client"

export default async function ProductsPage() {
    const { data: products } = await getProducts()
    return <AdminProductsClient products={products || []} />
}
