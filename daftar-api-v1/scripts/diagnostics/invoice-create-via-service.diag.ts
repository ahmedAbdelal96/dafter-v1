import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { InvoicesService } from '../../src/modules/invoices/invoices.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const service = app.get(InvoicesService);
  try {
    const res = await service.create('9e94692c-fcf2-4978-a74a-9ab7b519b96a','499ef1d8-17b4-4fc8-9b47-d7d8878dc880',{
      partyType: 'CUSTOMER' as any,
      partyId: '96ff7f20-0dc9-4ac9-abfa-0a4b3624bf0c',
      issueDate: '2026-03-17',
      items: [{ description: 'diag', quantity: 1, unitPrice: 10 }],
      notes: 'diag run'
    } as any);
    console.log('OK', res?.id);
  } catch (e: any) {
    console.error('ERR_NAME', e?.name);
    console.error('ERR_MSG', e?.message);
    console.error('ERR_CODE', e?.code);
    console.error('ERR_STACK', e?.stack);
  } finally {
    await app.close();
  }
}
run();
