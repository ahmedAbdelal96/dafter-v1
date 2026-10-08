import { Injectable } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationsRepository } from '../notifications.repository';
import { TranslationService } from '../../../common/services/translation.service';

export class ListNotificationsQuery {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Return only unread notifications',
    example: false,
    default: false,
  })
  @Type(() => Boolean)
  @IsOptional()
  onlyUnread?: boolean = false;
}

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string, query: ListNotificationsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.repo.findByUser(userId, {
      page,
      limit,
      onlyUnread: query.onlyUnread,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
