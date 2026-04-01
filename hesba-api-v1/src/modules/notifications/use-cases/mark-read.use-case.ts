import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from '../notifications.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class MarkReadUseCase {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string, notificationId: string) {
    const result = await this.repo.markOneRead(notificationId, userId);

    if (result === null) {
      throw new NotFoundException(
        this.t.translate('notifications.read.notFound'),
      );
    }

    return result;
  }
}
