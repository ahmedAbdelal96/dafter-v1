import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../notifications.repository';
import { TranslationService } from '../../../common/services/translation.service';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';

@Injectable()
export class RegisterDeviceTokenUseCase {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly t: TranslationService,
  ) {}

  async execute(userId: string, dto: RegisterDeviceTokenDto) {
    await this.repo.upsertDeviceToken({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceName: dto.deviceName,
    });
    return {
      message: this.t.translate('notifications.deviceToken.registered'),
    };
  }
}
