'use server'

import { prisma } from '@/lib/db/prisma'

/**
 * Return user's role at their first club staff assignment.
 * Returns null if not staff at any club.
 */
export async function getClubRole(profileId: string): Promise<string | null> {
    const staff = await prisma.clubStaff.findFirst({
        where: {
            profileId,
            active: true
        },
        select: { role: true },
        orderBy: { createdAt: 'asc' }
    })

    return staff?.role ?? null
}

/**
 * Return the club_id of the first club where user is staff.
 */
export async function getClubId(profileId: string): Promise<string | null> {
    const staff = await prisma.clubStaff.findFirst({
        where: {
            profileId,
            active: true
        },
        select: { clubId: true },
        orderBy: { createdAt: 'asc' }
    })

    return staff?.clubId ?? null
}

/**
 * Return { clubId, role } for user, or null if not staff.
 */
export async function getClubContext(profileId: string): Promise<{ clubId: string; role: string } | null> {
    const staff = await prisma.clubStaff.findFirst({
        where: {
            profileId,
            active: true
        },
        select: { clubId: true, role: true },
        orderBy: { createdAt: 'asc' }
    })

    if (!staff) return null
    return { clubId: staff.clubId, role: staff.role }
}
