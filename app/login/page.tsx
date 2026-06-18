'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Chrome, Loader2 } from "lucide-react"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { signIn, signUp } from '@/app/actions/auth'
import { TESTIDS } from '@/lib/testids'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setAuthError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        if (isSignUp) {
            const result = await signUp(email, password)

            if (result.error) {
                setAuthError(result.error)
                toast.error(result.error)
                setLoading(false)
            } else if (result.data) {
                toast.success('Conta criada com sucesso!')

                // Redireciona com base nos dados retornados da action
                if (result.data.isStaff) {
                    router.push('/dashboard')
                } else {
                    router.push('/onboarding')
                }
                router.refresh()
            }
        } else {
            const result = await signIn(email, password)

            if (result.error) {
                setAuthError('Credenciais inválidas')
                toast.error('Email ou senha incorretos')
                setLoading(false)
            } else if (result.data) {
                toast.success('Login realizado com sucesso!')

                // Redireciona com base nos dados retornados da action.
                // Diferente do signUp, um login bem-sucedido de um cliente
                // existente vai para a área do cliente, não para onboarding
                // (que é só para criar um novo clube).
                if (result.data.isStaff) {
                    router.push('/dashboard')
                } else {
                    router.push('/home')
                }
                router.refresh()
            }
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        toast.info('Autenticação com Google será disponibilizada em breve')
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700">
                <CardHeader className="space-y-1 text-center pb-6">
                    <div data-testid={TESTIDS.LOGO} className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-primary-foreground font-bold text-2xl">PM</span>
                    </div>
                    <CardTitle className="text-3xl font-bold">Padel Manager</CardTitle>
                    <CardDescription className="text-base">
                        {isSignUp ? 'Criar nova conta' : 'Entre na sua conta para continuar'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                                disabled={loading}
                                className="h-11"
                                data-testid={TESTIDS.EMAIL_INPUT}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                className="h-11"
                                data-testid={TESTIDS.PASSWORD_INPUT}
                            />
                        </div>
                        {authError && (
                            <p data-testid={TESTIDS.AUTH_ERROR} className="text-sm text-destructive">
                                {authError}
                            </p>
                        )}
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading} data-testid={TESTIDS.LOGIN_SUBMIT}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Entrando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                        </Button>
                        {!isSignUp && (
                            <button
                                type="button"
                                data-testid={TESTIDS.FORGOT_PASSWORD}
                                onClick={() => toast.info('Recuperação de senha será disponibilizada em breve')}
                                className="block text-center text-xs text-muted-foreground hover:underline w-full"
                            >
                                Esqueci minha senha
                            </button>
                        )}
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full h-11 text-base"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <Chrome className="mr-2 h-5 w-5" />
                        Google
                    </Button>

                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-primary hover:underline font-medium"
                            disabled={loading}
                        >
                            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Criar agora'}
                        </button>
                    </div>

                    {!isSignUp && (
                        <div className="mt-6 p-4 bg-muted rounded-lg">
                            <p className="text-xs text-slate-600 text-center mb-2 font-medium">Contas de Teste:</p>
                            <div className="space-y-1 text-xs text-slate-600">
                                <p><strong>Admin:</strong> admin@padelmanager.com</p>
                                <p><strong>Senha:</strong> adm@padel2026</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
