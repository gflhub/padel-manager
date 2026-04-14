import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Esta rota é apenas para setup inicial - deve ser removida em produção
export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        // Verificar se a requisição tem uma chave de segurança
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.ADMIN_SETUP_KEY}`) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Usar service role para criar usuário
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Criar usuário no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            user: authData.user
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
    }
}
