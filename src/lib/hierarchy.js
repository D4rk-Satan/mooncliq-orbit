import prisma from './prisma';

/**
 * Recursively fetches all subordinate user IDs for a given manager within an organization.
 * E.g., If Manager -> TL -> Executive, calling this for Manager returns [TL.id, Executive.id].
 *
 * @param {string} userId - The user ID of the manager.
 * @param {string} organizationId - The organization ID.
 * @returns {Promise<string[]>} - Array of subordinate user IDs.
 */
export async function getSubordinateUserIds(userId, organizationId) {
  if (!userId || !organizationId) return [];

  try {
    // Fetch all active users in the organization to traverse the hierarchy tree in memory (fast & avoids N+1 queries)
    const orgUsers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true
      },
      select: {
        id: true,
        reportsToId: true
      }
    });

    // Build manager -> subordinates mapping
    const managerToSubordinates = new Map();
    for (const u of orgUsers) {
      if (u.reportsToId) {
        if (!managerToSubordinates.has(u.reportsToId)) {
          managerToSubordinates.set(u.reportsToId, []);
        }
        managerToSubordinates.get(u.reportsToId).push(u.id);
      }
    }

    // Traverse BFS/DFS to collect all direct and indirect reportees
    const subordinateIds = new Set();
    const queue = [...(managerToSubordinates.get(userId) || [])];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!subordinateIds.has(currentId)) {
        subordinateIds.add(currentId);
        const nextLevel = managerToSubordinates.get(currentId) || [];
        queue.push(...nextLevel);
      }
    }

    return Array.from(subordinateIds);
  } catch (error) {
    console.error("Error calculating subordinate user IDs:", error);
    return [];
  }
}

/**
 * Returns all identifiers (id, email, name, nickname) for a list of user IDs.
 * Useful for matching owner fields across tasks, leads, deals, etc.
 *
 * @param {string[]} userIds - Array of user IDs.
 * @returns {Promise<Set<string>>} - Lowercased set of identifiers.
 */
export async function getUserIdentifiersList(userIds) {
  if (!userIds || userIds.length === 0) return new Set();

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        profile: {
          select: { nickname: true, name: true }
        }
      }
    });

    const identifiers = new Set();
    for (const u of users) {
      [
        u.id,
        u.email,
        u.name,
        u.nickname,
        u.profile?.nickname,
        u.profile?.name
      ].forEach(val => {
        if (val) identifiers.add(String(val).trim().toLowerCase());
      });
    }

    return identifiers;
  } catch (error) {
    console.error("Error fetching user identifiers list:", error);
    return new Set();
  }
}

