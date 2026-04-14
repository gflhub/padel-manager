import { Loader2 } from "lucide-react"

export default function LoadingCustomers() {
    return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando clientes...</p>
            </div>
        </div>
    )
}
