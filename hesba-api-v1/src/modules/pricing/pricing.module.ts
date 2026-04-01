import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';
import { GetCustomerPriceUseCase } from './use-cases/get-customer-price.use-case';
import { SetCustomerPriceUseCase } from './use-cases/set-customer-price.use-case';
import { ListCustomerPricesUseCase } from './use-cases/list-customer-prices.use-case';

@Module({
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
    GetCustomerPriceUseCase,
    SetCustomerPriceUseCase,
    ListCustomerPricesUseCase,
  ],
  exports: [PricingService, PricingRepository],
})
export class PricingModule {}
