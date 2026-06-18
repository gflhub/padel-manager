import { updateSession } from '@/lib/auth/middleware'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        // API routes handle their own auth (requireUser/requireClubContext)
        // and must return JSON 401s, not an HTML redirect to /login.
        '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
