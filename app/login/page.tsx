'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Chrome, Loader2 } from "lucide-react"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        const supabase = createClient()

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) {
                toast.error(error.message)
                setLoading(false)
            } else {
                toast.success('Verifique seu email para confirmar o cadastro!')
                setLoading(false)
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error('Email ou senha incorretos')
                setLoading(false)
            } else if (data.user) {
                // Verificar se é staff de algum clube
                const { data: staffData } = await supabase
                    .from('club_staff')
                    .select('role')
                    .eq('profile_id', data.user.id)
                    .eq('active', true)
                    .limit(1)
                    .single()

                toast.success('Login realizado com sucesso!')

                if (staffData) {
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
        const supabase = createClient()

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            toast.error(error.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700">
                <CardHeader className="space-y-1 text-center pb-6">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
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
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Entrando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                        </Button>
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
                            <p className="text-xs text-muted-foreground text-center mb-2 font-medium">Contas de Teste:</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
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
