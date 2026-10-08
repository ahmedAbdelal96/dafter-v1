// ============================================
// Users Service — Thin Orchestration Layer
// ============================================
// Delegates all business logic to dedicated use cases.
// This keeps each use case single-responsibility and testable.
// ============================================

import { Injectable } from '@nestjs/common';
import {
  CreateStaffUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  UpdatePermissionsUseCase,
  DisableUserUseCase,
  EnableUserUseCase,
  GetStatsUseCase,
  ResetUserCredentialsUseCase,
} from './use-cases';
import {
  CreateStaffDto,
  UpdateUserDto,
  UpdatePermissionsDto,
  UserQueryDto,
} from './dto';
import type { ResetUserCredentialsInput } from './use-cases/reset-user-credentials.use-case';

@Injectable()
export class UsersService {
  constructor(
    private readonly createStaffUseCase: CreateStaffUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updatePermissionsUseCase: UpdatePermissionsUseCase,
    private readonly disableUserUseCase: DisableUserUseCase,
    private readonly enableUserUseCase: EnableUserUseCase,
    private readonly getStatsUseCase: GetStatsUseCase,
    private readonly resetUserCredentialsUseCase: ResetUserCredentialsUseCase,
  ) {}

  async createStaff(
    companyId: string,
    actorUserId: string,
    dto: CreateStaffDto,
  ) {
    return this.createStaffUseCase.execute(companyId, actorUserId, dto);
  }

  async listUsers(companyId: string, query: UserQueryDto) {
    return this.listUsersUseCase.execute(companyId, query);
  }

  async getUser(companyId: string, userId: string) {
    return this.getUserUseCase.execute(companyId, userId);
  }

  async updateUser(
    companyId: string,
    userId: string,
    dto: UpdateUserDto,
    actorUserId: string,
  ) {
    return this.updateUserUseCase.execute(companyId, userId, dto, actorUserId);
  }

  async updatePermissions(
    companyId: string,
    userId: string,
    dto: UpdatePermissionsDto,
    actorUserId: string,
  ) {
    return this.updatePermissionsUseCase.execute(
      companyId,
      userId,
      dto,
      actorUserId,
    );
  }

  async disableUser(companyId: string, userId: string, actorUserId: string) {
    return this.disableUserUseCase.execute(companyId, userId, actorUserId);
  }

  async enableUser(companyId: string, userId: string, actorUserId: string) {
    return this.enableUserUseCase.execute(companyId, userId, actorUserId);
  }

  async getStats(companyId: string) {
    return this.getStatsUseCase.execute(companyId);
  }

  async resetCredentials(
    companyId: string,
    userId: string,
    actorUserId: string,
    input: ResetUserCredentialsInput,
  ) {
    return this.resetUserCredentialsUseCase.execute(
      companyId,
      userId,
      actorUserId,
      input,
    );
  }
}
