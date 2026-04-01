import { Injectable } from '@nestjs/common';
import { GetCustomerPriceUseCase } from './use-cases/get-customer-price.use-case';
import { SetCustomerPriceUseCase } from './use-cases/set-customer-price.use-case';
import { ListCustomerPricesUseCase } from './use-cases/list-customer-prices.use-case';
import { SetCustomerPriceDto } from './dto';

@Injectable()
export class PricingService {
  constructor(
    private readonly getUC: GetCustomerPriceUseCase,
    private readonly setUC: SetCustomerPriceUseCase,
    private readonly listUC: ListCustomerPricesUseCase,
  ) {}

  getCustomerPrice(companyId: string, customerId: string, productId: string) {
    return this.getUC.execute(companyId, customerId, productId);
  }

  setCustomerPrice(
    companyId: string,
    customerId: string,
    productId: string,
    dto: SetCustomerPriceDto,
    actorId: string,
  ) {
    return this.setUC.execute(companyId, customerId, productId, dto, actorId);
  }

  listCustomerPrices(companyId: string, customerId: string) {
    return this.listUC.execute(companyId, customerId);
  }
}
