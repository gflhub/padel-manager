import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/tokens'

function isAuthRoute(pathname: string) {
    return pathname.startsWith('/login') || pathname.startsWith('/auth')
}

function redirectToLogin(request: NextRequest) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
}

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request })

    // JWT verification (app-owned tokens via Prisma auth system)
    try {
        const accessToken = request.cookies.get('accessToken')?.value

        if (accessToken) {
            const payload = await verifyAccessToken(accessToken)

            if (payload) {
                // User is authenticated via JWT - continue
                return response
            }
        }
    } catch (error) {
        console.warn('JWT verification failed:', error instanceof Error ? error.message : error)
    }

    // No valid JWT found
    if (isAuthRoute(request.nextUrl.pathname)) {
        return response
    }

    return redirectToLogin(request)
}
