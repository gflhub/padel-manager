'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Check if user has one of the allowed staff roles at their club.
 * Returns true if the user has a matching role, false otherwise.
 */
export async function requireStaffRole(
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get profile ID from user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return false
    }

    // Check if user has staff role at their club and if it's in the allowed list
    const { data: clubStaff, error: staffError } = await supabase
      .from('club_staff')
      .select('role')
      .eq('profile_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (staffError || !clubStaff) {
      return false
    }

    return allowedRoles.includes(clubStaff.role)
  } catch {
    return false
  }
}

/**
 * Check if user can manage resources in a specific club.
 * Returns true if the user is a staff member with management role or higher.
 */
export async function canManageClubResource(
  userId: string,
  clubId: string
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get profile ID from user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return false
    }

    // Check if user is an active staff member of the specified club
    const { data: clubStaff, error: staffError } = await supabase
      .from('club_staff')
      .select('role')
      .eq('profile_id', profile.id)
      .eq('club_id', clubId)
      .eq('active', true)
      .single()

    if (staffError || !clubStaff) {
      return false
    }

    // Staff members with 'manager' or 'owner' roles can manage club resources
    const managerRoles = ['manager', 'owner', 'admin']
    return managerRoles.includes(clubStaff.role)
  } catch {
    return false
  }
}

/**
 * Check if user can manage another user.
 * Only admin users or club owners can manage other users.
 * Returns true if authorized, false otherwise.
 */
export async function canManageUser(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Check if user is a global admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!adminError && adminUser && adminUser.role === 'admin') {
      return true
    }

    // If not a global admin, check if user is a club owner who can manage the target user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return false
    }

    // Get the target user's profile
    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .single()

    if (targetProfileError || !targetProfile) {
      return false
    }

    // Check if both users are in the same club and the current user is an owner
    const { data: userStaff, error: userStaffError } = await supabase
      .from('club_staff')
      .select('club_id, role')
      .eq('profile_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (userStaffError || !userStaff) {
      return false
    }

    const { data: targetStaff, error: targetStaffError } = await supabase
      .from('club_staff')
      .select('club_id, role')
      .eq('profile_id', targetProfile.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (targetStaffError || !targetStaff) {
      return false
    }

    // User can manage target if they're in the same club and have owner role
    return (
      userStaff.club_id === targetStaff.club_id &&
      userStaff.role === 'owner'
    )
  } catch {
    return false
  }
}
