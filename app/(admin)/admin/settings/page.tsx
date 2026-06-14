import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSettings, updateComplexInfo, updateReservationSettings, updatePaymentSettings } from "@/app/actions/settings"

export default async function AdminSettingsPage() {
    const { data: settings } = await getSettings()

    const complexInfo = {
        name: settings?.complex_name ?? '',
        address: settings?.complex_address ?? '',
        phone: settings?.complex_phone ?? '',
        email: settings?.complex_email ?? '',
    }
    const reservationSettings = {
        max_advance_days: settings?.max_advance_days ?? 30,
        default_slot_duration: settings?.default_slot_duration ?? 90,
    }
    const paymentSettings = {
        pix_key: settings?.pix_key ?? '',
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground">Personalize seu complexo esportivo.</p>
            </div>

            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="reservations">Reservas</TabsTrigger>
                    <TabsTrigger value="payments">Pagamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações do Complexo</CardTitle>
                            <CardDescription>Dados exibidos para os clientes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={updateComplexInfo} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2"><Label>Nome</Label><Input name="complex_name" defaultValue={complexInfo.name} /></div>
                                    <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={complexInfo.email} /></div>
                                    <div className="space-y-2"><Label>Telefone</Label><Input name="phone" defaultValue={complexInfo.phone} /></div>
                                    <div className="space-y-2"><Label>Endereço</Label><Input name="address" defaultValue={complexInfo.address} /></div>
                                </div>
                                <Button type="submit">Salvar</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reservations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Reserva</CardTitle>
                            <CardDescription>Regras e políticas de agendamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={updateReservationSettings} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Antecedência máxima (dias)</Label>
                                        <Input name="max_advance_days" type="number" min={1} max={365} defaultValue={reservationSettings.max_advance_days} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Duração padrão (min)</Label>
                                        <Input name="default_slot_duration" type="number" min={15} max={480} defaultValue={reservationSettings.default_slot_duration} />
                                    </div>
                                </div>
                                <Button type="submit">Salvar</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pagamentos</CardTitle>
                            <CardDescription>Configurações de pagamento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={updatePaymentSettings} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Chave PIX</Label>
                                        <Input name="pix_key" defaultValue={paymentSettings.pix_key} placeholder="email@exemplo.com, CPF/CNPJ ou chave aleatória" />
                                    </div>
                                </div>
                                <Button type="submit">Salvar</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
