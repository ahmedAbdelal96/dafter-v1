import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../notifications.repository';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class UnregisterDeviceTokenUseCase {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string, token: string) {
    await this.repo.deactivateToken(token, userId);
    return {
      message: this.t.translate('notifications.deviceToken.unregistered'),
    };
  }
}
