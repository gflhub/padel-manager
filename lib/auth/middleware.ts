import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db/prisma'

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
    } catch (error) {
        console.warn('JWT verification failed:', error instanceof Error ? error.message : error)
    }

    // No valid, current JWT found
    if (isAuthRoute(request.nextUrl.pathname)) {
        return response
    }

    return redirectToLogin(request)
}
