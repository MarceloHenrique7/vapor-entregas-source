import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import type { Role, UserStatus } from "@/server/auth/types";
import type { ReportStatus } from "@/server/reputation/types";

import { AdminActionConflictError } from "./errors";
import type { AdminActor } from "./types";

export function assertAdminAccess(
  actor: AdminActor | null,
): asserts actor is AdminActor {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "ADMIN" || actor.status !== "ACTIVE")
    throw new ForbiddenError();
}

export function assertModerationTarget(
  actorId: string,
  target: { id: string; role: Role; status?: UserStatus },
) {
  if (actorId === target.id)
    throw new AdminActionConflictError(
      "O administrador não pode alterar o próprio status.",
    );
  if (target.role === "ADMIN")
    throw new AdminActionConflictError(
      "Contas administrativas não podem ser moderadas por esta ação.",
    );
  if (target.status === "DELETED")
    throw new AdminActionConflictError(
      "Uma conta encerrada não pode ser reativada pela moderação.",
    );
}

export function administrativeActionForStatus(
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED",
) {
  return status === "SUSPENDED"
    ? ("USER_SUSPENDED" as const)
    : status === "BLOCKED"
      ? ("USER_BANNED" as const)
      : ("USER_REACTIVATED" as const);
}

const reportTransitions: Record<ReportStatus, readonly ReportStatus[]> = {
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["RESOLVED", "DISMISSED"],
  RESOLVED: ["UNDER_REVIEW"],
  DISMISSED: ["UNDER_REVIEW"],
};

export function canTransitionReport(from: ReportStatus, to: ReportStatus) {
  return reportTransitions[from].includes(to);
}

export function hasOperationalAccess(status: UserStatus) {
  return status === "ACTIVE";
}
