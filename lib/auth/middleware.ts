import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { refreshAccessToken as rotateTokens } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db/prisma'

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
}

function isAuthRoute(pathname: string) {
    return pathname.startsWith('/login') || pathname.startsWith('/auth')
}

function redirectToLogin(request: NextRequest) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
}

/**
 * Attempts a silent refresh using the refresh token cookie when the access
 * token is missing/expired/revoked. Without this, every session would be
 * forcibly logged out 15 minutes in despite holding a valid 30-day refresh
 * token (AUTH-03/AUTH-04).
 */
async function tryRefresh(request: NextRequest, response: NextResponse): Promise<NextResponse | null> {
    const refreshToken = request.cookies.get('refreshToken')?.value
    if (!refreshToken) return null

    const result = await rotateTokens(refreshToken)
    if (!result) return null

    response.cookies.set('accessToken', result.accessToken, { ...cookieOptions, maxAge: 15 * 60 })
    response.cookies.set('refreshToken', result.refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 })
    return response
}

export async function updateSession(request: NextRequest) {
    const response = NextResponse.next({ request })

    try {
        const accessToken = request.cookies.get('accessToken')?.value

        if (accessToken) {
            const payload = await verifyAccessToken(accessToken)

            if (payload) {
                const user = await prisma.user.findUnique({
                    where: { id: payload.sub },
                    select: { tokenVersion: true },
                })

                if (user && user.tokenVersion === payload.tokenVersion) {
                    // User is authenticated and the token has not been revoked
                    return response
                }
            }
        }

        const refreshed = await tryRefresh(request, response)
        if (refreshed) return refreshed
    } catch (error) {
        console.warn('JWT verification failed:', error instanceof Error ? error.message : error)
    }

    // No valid, current JWT found
    if (isAuthRoute(request.nextUrl.pathname)) {
        return response
    }

    return redirectToLogin(request)
}
