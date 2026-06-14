import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { Clock, Users, MapPin, Calendar } from "lucide-react"
import { getActiveCourts } from "@/app/actions/courts"

export default async function ClientHomePage() {
    const { data: courts } = await getActiveCourts()

    const courtsList = courts || []

    const courtTypeLabels: Record<string, string> = {
        padel: 'Padel',
        tennis: 'Tênis',
        beach_tennis: 'Beach Tennis',
        futsal: 'Futsal',
        volleyball: 'Vôlei',
    }

    const courtTypeColors: Record<string, string> = {
        padel: 'bg-blue-100 text-blue-800 border-blue-200',
        tennis: 'bg-green-100 text-green-800 border-green-200',
        beach_tennis: 'bg-orange-100 text-orange-800 border-orange-200',
        futsal: 'bg-purple-100 text-purple-800 border-purple-200',
        volleyball: 'bg-pink-100 text-pink-800 border-pink-200',
    }

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8 md:p-12 text-white shadow-xl">
                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Reserve sua Quadra
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl">
                        Escolha entre nossas quadras disponíveis e garanta seu horário de jogo.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button size="lg" variant="secondary" asChild className="shadow-lg">
                            <Link href="/reservations/new">
                                <Calendar className="mr-2 h-5 w-5" />
                                Nova Reserva
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            <Link href="/reservations">
                                Ver Minhas Reservas
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Courts Grid */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Quadras Disponíveis</h2>
                        <p className="text-muted-foreground">Escolha a quadra ideal para seu jogo</p>
                    </div>
                </div>

                {courtsList.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {courtsList.map((court) => (
                            <Card key={court.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <CardTitle className="text-xl">{court.name}</CardTitle>
                                        <Badge
                                            variant="outline"
                                            className={courtTypeColors[court.court_type] || 'bg-slate-100 text-slate-800'}
                                        >
                                            {courtTypeLabels[court.court_type] || court.court_type}
                                        </Badge>
                                    </div>
                                    <CardDescription className="flex flex-col gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span>{court.duration_slot} minutos por horário</span>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <div className="bg-slate-50 rounded-lg p-4 border">
                                        <div className="text-3xl font-bold text-primary">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(court.price_per_slot)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">por horário</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Button className="w-full" size="lg" asChild>
                                        <Link href={`/reservations/new?court_id=${court.id}`}>
                                            Ver Horários Disponíveis
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">
                                Nenhuma quadra disponível no momento
                            </p>
                            <p className="text-sm text-muted-foreground text-center max-w-md">
                                As quadras serão exibidas aqui assim que o administrador cadastrá-las.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* Info Cards */}
            <section className="grid gap-6 md:grid-cols-3">
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Horários Flexíveis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Reserve com antecedência e escolha o melhor horário para você e seus amigos.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Jogue em Grupo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Adicione seus parceiros de jogo e divida o valor da reserva entre todos.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Gestão Simples
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe todas as suas reservas em um só lugar de forma fácil e rápida.
                        </p>
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}
