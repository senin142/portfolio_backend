import { ForbiddenException } from '@nestjs/common';
import { Role } from './enums/role.enum';
import { AuthenticatedUser } from '../auth/jwt.strategy';

/** Editors may only mutate their own resources; admins bypass this entirely.
 * Call this after loading the resource, before mutating it — see backend/CLAUDE.md's
 * "Authorization" section for which routes are expected to call this. */
export function assertOwnerOrAdmin(user: AuthenticatedUser, resourceAuthorId: string) {
  if (user.role !== Role.ADMIN && user.id !== resourceAuthorId) {
    throw new ForbiddenException("You don't have access to this resource");
  }
}
