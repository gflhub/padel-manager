import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"

export default function ProfilePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
                <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
            </div>

            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <User className="h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle className="text-xl mb-2">Em Desenvolvimento</CardTitle>
                    <p className="text-muted-foreground text-center max-w-md">
                        A página de perfil estará disponível em breve.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
