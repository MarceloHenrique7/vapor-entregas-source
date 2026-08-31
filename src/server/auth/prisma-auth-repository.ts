import "server-only";

import type { AuthRepository } from "./authenticate";
import { getPrisma } from "../db/prisma";

export const prismaAuthRepository: AuthRepository = {
  async findUserByEmail(email) {
    return getPrisma().user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });
  },

  async recordFailedLogin(userId, failedAttempts, lockedUntil) {
    await getPrisma().user.update({
      where: { id: userId },
      data: { failedLoginAttempts: failedAttempts, lockedUntil },
    });
  },

  async recordSuccessfulLogin(userId, occurredAt) {
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: occurredAt,
      },
    });
  },
};
