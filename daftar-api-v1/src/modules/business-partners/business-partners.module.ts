import { Module } from '@nestjs/common';
import { BusinessPartnersController } from './business-partners.controller';
import { BusinessPartnersRepository } from './business-partners.repository';
import { BusinessPartnersService } from './business-partners.service';

@Module({
  controllers: [BusinessPartnersController],
  providers: [BusinessPartnersService, BusinessPartnersRepository],
  exports: [BusinessPartnersService, BusinessPartnersRepository],
})
export class BusinessPartnersModule {}
