import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../notifications.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string) {
    const count = await this.repo.countUnread(userId);
    return { count };
  }
}
