import 'reflect-metadata';
import { PrismaService } from '../../src/database/prisma/prisma.service';
import { InvoicesRepository } from '../../src/modules/invoices/invoices.repository';
import { CreateInvoiceUseCase } from '../../src/modules/invoices/use-cases/create-invoice.use-case';

async function run() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const repo = new InvoicesRepository(prisma as any);
  const t = { translate: (k: string) => k } as any;
  const uc = new CreateInvoiceUseCase(repo, t);

  try {
    const res = await uc.execute('9e94692c-fcf2-4978-a74a-9ab7b519b96a','499ef1d8-17b4-4fc8-9b47-d7d8878dc880',{
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
    console.error('ERR_META', e?.meta ? JSON.stringify(e.meta) : null);
    console.error('ERR_STACK', e?.stack);
  } finally {
    await prisma.onModuleDestroy();
  }
}

run();
