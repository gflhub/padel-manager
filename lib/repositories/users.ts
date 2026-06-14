'use server';

import { prisma } from '@/lib/db/prisma';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * User Repository
 *
 * Handles all data access and business logic for user profiles and management.
 * Manages user creation, profile updates, role assignments, and queries.
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  notes: string | null;
  active: boolean;
  joined_at: string;
}

export interface ClubMemberWithProfile extends ClubMember {
  profile?: UserProfile;
}

type PrismaProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  cpf: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapProfile(profile: PrismaProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    cpf: profile.cpf,
    avatar_url: profile.avatarUrl,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

/**
 * Get all users for the global admin user list.
 * @returns Users list or error
 */
export async function getAllUsers(): Promise<{ data: AdminUserListItem[] | null; error: string | null }> {
  try {
    const users = await prisma.user.findMany({
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });

    const items: AdminUserListItem[] = users.map((user) => ({
      id: user.id,
      name: user.profile?.name ?? '',
      email: user.email,
      phone: user.profile?.phone ?? null,
      role: user.globalRole.toLowerCase(),
      active: user.active,
      created_at: user.createdAt.toISOString(),
    }));

    return { data: items, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar usuários';
    return { data: null, error: message };
  }
}

/**
 * Get user profile by ID.
 * @param userId - User ID
 * @returns User profile or error
 */
export async function getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) return { data: null, error: 'Perfil de usuário não encontrado' };
    return { data: mapProfile(profile), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar perfil';
    return { data: null, error: message };
  }
}

/**
 * Update user profile.
 * @param userId - User ID
 * @param updates - Fields to update
 * @returns Updated profile or error
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>
): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.cpf !== undefined && { cpf: updates.cpf }),
        ...(updates.avatar_url !== undefined && { avatarUrl: updates.avatar_url }),
        updatedAt: new Date(),
      },
    });

    return { data: mapProfile(profile), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil';
    return { data: null, error: message };
  }
}

/**
 * Get all club members.
 * @param clubId - Club ID
 * @returns Club members list or error
 */
export async function getClubMembers(clubId: string): Promise<{ data: ClubMemberWithProfile[] | null; error: string | null }> {
  try {
    const staffMembers = await prisma.clubStaff.findMany({
      where: { clubId },
      include: { profile: true },
      orderBy: { profile: { name: 'asc' } },
    });

    const members: ClubMemberWithProfile[] = staffMembers.map((staff) => ({
      id: staff.id,
      club_id: staff.clubId,
      profile_id: staff.profileId,
      name: staff.profile.name,
      email: staff.profile.email,
      phone: staff.profile.phone,
      cpf: staff.profile.cpf,
      notes: null,
      active: staff.active,
      joined_at: staff.createdAt.toISOString(),
      profile: {
        id: staff.profile.id,
        email: staff.profile.email,
        name: staff.profile.name,
        phone: staff.profile.phone,
        cpf: staff.profile.cpf,
        avatar_url: staff.profile.avatarUrl,
        created_at: staff.profile.createdAt.toISOString(),
        updated_at: staff.profile.updatedAt.toISOString(),
      },
    }));

    return { data: members, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar membros do clube';
    return { data: null, error: message };
  }
}

/**
 * Get a club member by ID.
 * @param memberId - Club member ID
 * @param clubId - Club ID (for authorization)
 * @returns Club member or error
 */
export async function getClubMemberById(
  memberId: string,
  clubId: string
): Promise<{ data: ClubMember | null; error: string | null }> {
  try {
    const staff = await prisma.clubStaff.findUnique({
      where: { id: memberId },
      include: { profile: true },
    });

    if (!staff || staff.clubId !== clubId) {
      return { data: null, error: 'Membro não encontrado' };
    }

    const member: ClubMember = {
      id: staff.id,
      club_id: staff.clubId,
      profile_id: staff.profileId,
      name: staff.profile.name,
      email: staff.profile.email,
      phone: staff.profile.phone,
      cpf: staff.profile.cpf,
      notes: null,
      active: staff.active,
      joined_at: staff.createdAt.toISOString(),
    };

    return { data: member, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar membro';
    return { data: null, error: message };
  }
}

/**
 * Create a club member.
 * @param clubId - Club ID
 * @param name - Member name
 * @param email - Member email (optional)
 * @param phone - Member phone (optional)
 * @param cpf - Member CPF (optional)
 * @param profileId - Profile ID if linked to existing user (optional)
 * @param notes - Member notes (optional)
 * @returns Created member or error
 */
export async function createClubMember(
  clubId: string,
  name: string,
  email?: string,
  phone?: string,
  cpf?: string,
  profileId?: string,
  notes?: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<{ data: ClubMember | null; error: string | null }> {
  try {
    if (!name?.trim()) {
      return { data: null, error: 'Nome do membro é obrigatório' };
    }

    let profile = email
      ? await prisma.profile.findFirst({
          where: { email: email.toLowerCase().trim() },
        })
      : null;

    if (!profile) {
      let userId = profileId;

      if (!userId) {
        const placeholderEmail = email
          ? email.toLowerCase().trim()
          : `member-${randomUUID()}@placeholder.local`;
        const passwordHash = await bcrypt.hash(randomUUID(), 10);

        const newUser = await prisma.user.create({
          data: {
            email: placeholderEmail,
            passwordHash,
            globalRole: 'CLIENT',
            active: false,
          },
        });
        userId = newUser.id;
      }

      profile = await prisma.profile.create({
        data: {
          userId,
          name: name.trim(),
          email: email ? email.toLowerCase().trim() : `${userId}@placeholder.local`,
          phone: phone || null,
          cpf: cpf?.replace(/\D/g, '') || null,
        },
      });
    }

    const staff = await prisma.clubStaff.create({
      data: {
        clubId,
        profileId: profile?.id || profileId || '',
        role: 'STAFF',
        active: true,
      },
      include: { profile: true },
    });

    const member: ClubMember = {
      id: staff.id,
      club_id: staff.clubId,
      profile_id: staff.profileId,
      name: staff.profile.name,
      email: staff.profile.email,
      phone: staff.profile.phone,
      cpf: staff.profile.cpf,
      notes: null,
      active: staff.active,
      joined_at: staff.createdAt.toISOString(),
    };

    return { data: member, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar membro';
    return { data: null, error: message };
  }
}

/**
 * Update a club member.
 * @param memberId - Club member ID
 * @param clubId - Club ID (for authorization)
 * @param updates - Fields to update
 * @returns Updated member or error
 */
export async function updateClubMember(
  memberId: string,
  clubId: string,
  updates: Partial<Omit<ClubMember, 'id' | 'club_id' | 'joined_at'>>
): Promise<{ data: ClubMember | null; error: string | null }> {
  try {
    const existing = await prisma.clubStaff.findUnique({
      where: { id: memberId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { data: null, error: 'Membro não encontrado' };
    }

    const staff = await prisma.clubStaff.update({
      where: { id: memberId },
      data: {
        active: updates.active,
        updatedAt: new Date(),
      },
      include: { profile: true },
    });

    const member: ClubMember = {
      id: staff.id,
      club_id: staff.clubId,
      profile_id: staff.profileId,
      name: staff.profile.name,
      email: staff.profile.email,
      phone: staff.profile.phone,
      cpf: staff.profile.cpf,
      notes: null,
      active: staff.active,
      joined_at: staff.createdAt.toISOString(),
    };

    return { data: member, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar membro';
    return { data: null, error: message };
  }
}

/**
 * Toggle club member active status.
 * @param memberId - Club member ID
 * @param clubId - Club ID (for authorization)
 * @param active - Active status
 * @returns Error or null
 */
export async function toggleClubMemberActive(memberId: string, clubId: string, active: boolean): Promise<{ error: string | null }> {
  try {
    const existing = await prisma.clubStaff.findUnique({
      where: { id: memberId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { error: 'Membro não encontrado' };
    }

    await prisma.clubStaff.update({
      where: { id: memberId },
      data: { active },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar status do membro';
    return { error: message };
  }
}
