import 'dotenv/config';

import { ConflictException } from '@nestjs/common';
import { BusinessPartnerType, OpeningBalanceBatchStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformIdempotencyService } from '../platform/idempotency/platform-idempotency.service';
import { BusinessPartnersService } from '../business-partners/business-partners.service';
import { InitializeCompanyAccounting } from '../accounting-bootstrap/accounting-bootstrap.service';
import { TemplateService } from '../accounting-bootstrap/template.service';
import { AccountingService } from '../accounting/accounting.service';
import { OpeningBalancesService } from './opening-balances.service';

jest.setTimeout(30_000);

describe('B02 controlled opening balances', () => {
  let prisma: PrismaService;
  let opening: OpeningBalancesService;
  let partners: BusinessPartnersService;
  let company: { id: string };
  let owner: { id: string };
  let periodId: string;
  let augustPeriodId: string;
  let arAccountId: string;
  let apAccountId: string;
  let cashAccountId: string;
  let openingEquityId: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL is required for B02 integration tests');
    prisma = new PrismaService();
    await prisma.$connect();
    const idempotency = new PlatformIdempotencyService(prisma);
    const accounting = new AccountingService(prisma, idempotency);
    opening = new OpeningBalancesService(prisma, accounting, idempotency);
    partners = new BusinessPartnersService(prisma);
    await prisma.currency.upsert({
      where: { code: 'EGP' },
      update: { isActive: true },
      create: { code: 'EGP', name: 'Egyptian Pound', minorUnitPrecision: 2 },
    });
    const stamp = Date.now();
    company = await prisma.company.create({
      data: { name: `B02 Opening ${stamp}`, currencyCode: 'EGP' },
    });
    owner = await prisma.user.create({
      data: {
        email: `b02-opening-${stamp}@example.test`,
        passwordHash: 'test-hash',
        fullName: 'Opening Owner',
        companyId: company.id,
        role: 'OWNER',
      },
    });
    await new InitializeCompanyAccounting(
      prisma,
      idempotency,
      new TemplateService(prisma),
    ).execute({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: `opening-bootstrap-${stamp}`,
      countryCode: 'EG',
      localeCode: 'ar-EG',
      baseCurrencyCode: 'EGP',
      templateCode: 'EG_STANDARD_V1',
      templateVersion: 1,
      fiscalYearStart: new Date('2026-07-01T00:00:00.000Z'),
      fiscalYearEnd: new Date('2027-06-30T00:00:00.000Z'),
    });
    periodId = (
      await prisma.accountingPeriod.findFirstOrThrow({
        where: { companyId: company.id, name: '2026-07' },
      })
    ).id;
    augustPeriodId = (
      await prisma.accountingPeriod.findFirstOrThrow({
        where: { companyId: company.id, name: '2026-08' },
      })
    ).id;
    arAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: company.id, templateKey: 'AR_CONTROL' },
      })
    ).id;
    apAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: company.id, templateKey: 'AP_CONTROL' },
      })
    ).id;
    openingEquityId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: company.id, templateKey: 'OPENING_BALANCE_EQUITY' },
      })
    ).id;
    cashAccountId = (
      await prisma.accountingAccount.findFirstOrThrow({
        where: { companyId: company.id, templateKey: 'CASH' },
      })
    ).id;
    customerId = (
      await partners.create(company.id, owner.id, {
        partnerCode: `OPEN-CUST-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'Opening Customer',
        roles: ['CUSTOMER'],
      })
    ).id;
    supplierId = (
      await partners.create(company.id, owner.id, {
        partnerCode: `OPEN-SUP-${stamp}`,
        partnerType: BusinessPartnerType.ORGANIZATION,
        displayName: 'Opening Supplier',
        roles: ['SUPPLIER'],
      })
    ).id;
  });

  afterAll(async () => {
    // Posted journal lines are intentionally immutable; the disposable test database is dropped by the test harness.
    await prisma?.$disconnect();
  });

  const customerLines = () => [
    {
      accountId: arAccountId,
      businessPartnerId: customerId,
      debit: '100',
      credit: '0',
      description: 'Customer opening balance',
    },
    {
      accountId: openingEquityId,
      debit: '0',
      credit: '100',
      description: 'Opening balance equity',
    },
  ];

  it('validates and posts customer AR and supplier AP openings with the partner FK', async () => {
    await expect(
      opening.createDraft({
        companyId: company.id,
        actorUserId: owner.id,
        idempotencyKey: 'opening-missing-ar',
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        accountingPeriodId: periodId,
        description: 'Missing AR partner',
        lines: [
          { accountId: arAccountId, debit: '10', credit: '0' },
          { accountId: openingEquityId, debit: '0', credit: '10' },
        ],
      }),
    ).rejects.toThrow('require a business partner');
    await expect(
      opening.createDraft({
        companyId: company.id,
        actorUserId: owner.id,
        idempotencyKey: 'opening-missing-ap',
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        accountingPeriodId: periodId,
        description: 'Missing AP partner',
        lines: [
          { accountId: apAccountId, debit: '0', credit: '10' },
          { accountId: openingEquityId, debit: '10', credit: '0' },
        ],
      }),
    ).rejects.toThrow('require a business partner');
    await expect(
      opening.createDraft({
        companyId: company.id,
        actorUserId: owner.id,
        idempotencyKey: 'opening-excess-precision',
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        accountingPeriodId: periodId,
        description: 'Excess precision',
        lines: [
          { accountId: cashAccountId, debit: '10.001', credit: '0' },
          { accountId: openingEquityId, debit: '0', credit: '10.001' },
        ],
      }),
    ).rejects.toThrow('at most 2 decimal places');
    const customerBatch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-customer-1',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Customer opening',
      lines: customerLines(),
    });
    await expect(
      opening.validate(company.id, owner.id, customerBatch.id),
    ).resolves.toEqual(
      expect.objectContaining({ status: OpeningBalanceBatchStatus.VALIDATED }),
    );
    const posted = await opening.post(
      company.id,
      owner.id,
      customerBatch.id,
      'opening-post-customer',
    );
    expect(posted.status).toBe(OpeningBalanceBatchStatus.POSTED);
    expect(
      await prisma.journalLine.findFirst({
        where: {
          journalEntryId: posted.journalEntryId!,
          businessPartnerId: customerId,
        },
      }),
    ).toBeTruthy();

    const supplierBatch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-supplier-1',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Supplier opening',
      lines: [
        {
          accountId: apAccountId,
          businessPartnerId: supplierId,
          debit: '0',
          credit: '50',
        },
        { accountId: openingEquityId, debit: '50', credit: '0' },
      ],
    });
    await opening.validate(company.id, owner.id, supplierBatch.id);
    expect(
      (
        await opening.post(
          company.id,
          owner.id,
          supplierBatch.id,
          'opening-post-supplier',
        )
      ).status,
    ).toBe(OpeningBalanceBatchStatus.POSTED);
  });

  it('replays idempotent draft creation and keeps posted batches immutable', async () => {
    const payload = {
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-replay-1',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Replay opening',
      lines: [
        { accountId: cashAccountId, debit: '20', credit: '0' },
        { accountId: openingEquityId, debit: '0', credit: '20' },
      ],
    };
    const first = await opening.createDraft(payload);
    const replay = await opening.createDraft(payload);
    expect(replay.id).toBe(first.id);
    await opening.validate(company.id, owner.id, first.id);
    const firstPost = await opening.post(
      company.id,
      owner.id,
      first.id,
      'opening-post-replay',
    );
    const replayPost = await opening.post(
      company.id,
      owner.id,
      first.id,
      'opening-post-replay',
    );
    expect(replayPost.journalEntryId).toBe(firstPost.journalEntryId);
    expect(
      await prisma.journalEntry.count({
        where: { sourceId: first.id, sourceType: 'OPENING_BALANCE' },
      }),
    ).toBe(1);
    await expect(
      opening.post(company.id, owner.id, first.id, 'opening-post-replay-again'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back the journal when the opening-balance state audit fails', async () => {
    const batch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-atomic-post',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Atomic post failure',
      lines: [
        { accountId: cashAccountId, debit: '7', credit: '0' },
        { accountId: openingEquityId, debit: '0', credit: '7' },
      ],
    });
    await opening.validate(company.id, owner.id, batch.id);
    const auditSpy = jest
      .spyOn(opening as never, 'audit' as never)
      .mockRejectedValueOnce(new Error('injected opening audit failure'));
    await expect(
      opening.post(company.id, owner.id, batch.id, 'opening-atomic-post-key'),
    ).rejects.toThrow('injected opening audit failure');
    auditSpy.mockRestore();
    expect(
      await prisma.openingBalanceBatch.findUniqueOrThrow({
        where: { id: batch.id },
      }),
    ).toEqual(
      expect.objectContaining({ status: OpeningBalanceBatchStatus.VALIDATED }),
    );
    expect(
      await prisma.journalEntry.count({
        where: { sourceId: batch.id, sourceType: 'OPENING_BALANCE' },
      }),
    ).toBe(0);
  });

  it('rejects wrong-role openings and reverses a posted batch', async () => {
    await expect(
      opening.createDraft({
        companyId: company.id,
        actorUserId: owner.id,
        idempotencyKey: 'opening-wrong-role',
        effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
        accountingPeriodId: periodId,
        description: 'Wrong role',
        lines: [
          {
            accountId: arAccountId,
            businessPartnerId: supplierId,
            debit: '10',
            credit: '0',
          },
          { accountId: openingEquityId, debit: '0', credit: '10' },
        ],
      }),
    ).rejects.toThrow();
    const batch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-reverse',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Reverse opening',
      lines: [
        { accountId: cashAccountId, debit: '30', credit: '0' },
        { accountId: openingEquityId, debit: '0', credit: '30' },
      ],
    });
    await opening.validate(company.id, owner.id, batch.id);
    const posted = await opening.post(
      company.id,
      owner.id,
      batch.id,
      'opening-post-reverse',
    );
    const reversed = await opening.reverse(company.id, owner.id, batch.id, {
      accountingPeriodId: periodId,
      postingDate: '2026-07-02',
      reason: 'Correction',
      idempotencyKey: 'opening-reverse-command',
    });
    expect(reversed.status).toBe(OpeningBalanceBatchStatus.REVERSED);
    expect(reversed.journalEntryId).toBe(posted.journalEntryId);
    const reversalReplay = await opening.reverse(
      company.id,
      owner.id,
      batch.id,
      {
        accountingPeriodId: periodId,
        postingDate: '2026-07-02',
        reason: 'Correction',
        idempotencyKey: 'opening-reverse-command',
      },
    );
    expect(reversalReplay.reversalJournalEntryId).toBe(
      reversed.reversalJournalEntryId,
    );
    expect(
      await prisma.journalEntry.count({
        where: { reversalOfEntryId: posted.journalEntryId! },
      }),
    ).toBe(1);
    await expect(
      prisma.openingBalanceBatch.update({
        where: { id: batch.id },
        data: { description: 'tampered' },
      }),
    ).rejects.toThrow('immutable');
    const line = await prisma.openingBalanceLine.findFirstOrThrow({
      where: { batchId: batch.id },
    });
    await expect(
      prisma.openingBalanceLine.update({
        where: { id: line.id },
        data: { description: 'tampered' },
      }),
    ).rejects.toThrow('immutable');
    await expect(
      prisma.openingBalanceBatch.delete({ where: { id: batch.id } }),
    ).rejects.toThrow('cannot be deleted');
  });

  it('rolls back a reversal and batch state together on failure', async () => {
    const batch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-atomic-reverse',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Atomic reverse failure',
      lines: [
        { accountId: cashAccountId, debit: '8', credit: '0' },
        { accountId: openingEquityId, debit: '0', credit: '8' },
      ],
    });
    await opening.validate(company.id, owner.id, batch.id);
    const posted = await opening.post(
      company.id,
      owner.id,
      batch.id,
      'opening-atomic-reverse-post',
    );
    const auditSpy = jest
      .spyOn(opening as never, 'audit' as never)
      .mockRejectedValueOnce(new Error('injected reversal audit failure'));
    await expect(
      opening.reverse(company.id, owner.id, batch.id, {
        accountingPeriodId: periodId,
        postingDate: '2026-07-02',
        reason: 'Atomic reversal failure',
        idempotencyKey: 'opening-atomic-reverse-key',
      }),
    ).rejects.toThrow('injected reversal audit failure');
    auditSpy.mockRestore();
    expect(
      await prisma.openingBalanceBatch.findUniqueOrThrow({
        where: { id: batch.id },
      }),
    ).toEqual(
      expect.objectContaining({ status: OpeningBalanceBatchStatus.POSTED }),
    );
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: posted.journalEntryId! },
      }),
    ).toEqual(expect.objectContaining({ status: 'POSTED' }));
    expect(
      await prisma.journalEntry.count({
        where: { reversalOfEntryId: posted.journalEntryId! },
      }),
    ).toBe(0);
  });

  it('requires OPEN periods for opening-balance validation', async () => {
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'SOFT_CLOSED' },
    });
    const batch = await opening.createDraft({
      companyId: company.id,
      actorUserId: owner.id,
      idempotencyKey: 'opening-soft-close',
      effectiveDate: new Date('2026-07-01T00:00:00.000Z'),
      accountingPeriodId: periodId,
      description: 'Soft close opening',
      lines: [
        { accountId: cashAccountId, debit: '5', credit: '0' },
        { accountId: openingEquityId, debit: '0', credit: '5' },
      ],
    });
    await expect(
      opening.validate(company.id, owner.id, batch.id),
    ).rejects.toThrow('require an OPEN period');
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'OPEN' },
    });
  });

  it('reverses a July opening balance into August after July is closed', async () => {
    const makePostedBatch = async (key: string) => {
      const batch = await opening.createDraft({
        companyId: company.id,
        actorUserId: owner.id,
        idempotencyKey: key,
        effectiveDate: new Date('2026-07-03T00:00:00.000Z'),
        accountingPeriodId: periodId,
        description: `Closed-period reversal ${key}`,
        lines: [
          { accountId: cashAccountId, debit: '12', credit: '0' },
          { accountId: openingEquityId, debit: '0', credit: '12' },
        ],
      });
      await opening.validate(company.id, owner.id, batch.id);
      return opening.post(company.id, owner.id, batch.id, `${key}-post`);
    };
    const reversible = await makePostedBatch('opening-closed-reversal');
    const closedTarget = await makePostedBatch('opening-closed-target');
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'CLOSED' },
    });

    const reversed = await opening.reverse(
      company.id,
      owner.id,
      reversible.id,
      {
        accountingPeriodId: augustPeriodId,
        postingDate: '2026-08-03',
        reason: 'Reverse after July close',
        idempotencyKey: 'opening-closed-reversal-command',
      },
    );
    expect(reversed.status).toBe(OpeningBalanceBatchStatus.REVERSED);
    expect(reversed.reversalJournalEntryId).toBeTruthy();
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: reversible.journalEntryId! },
      }),
    ).toEqual(expect.objectContaining({ accountingPeriodId: periodId }));
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: reversed.reversalJournalEntryId! },
      }),
    ).toEqual(expect.objectContaining({ accountingPeriodId: augustPeriodId }));
    expect(
      await prisma.accountingPeriod.findUniqueOrThrow({
        where: { id: periodId },
      }),
    ).toEqual(expect.objectContaining({ status: 'CLOSED' }));
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: reversible.journalEntryId! },
      }),
    ).toEqual(expect.objectContaining({ status: 'REVERSED' }));
    expect(
      await prisma.journalEntry.findUniqueOrThrow({
        where: { id: reversed.reversalJournalEntryId! },
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'POSTED',
        reversalOfEntryId: reversible.journalEntryId,
      }),
    );
    await expect(
      opening.reverse(company.id, owner.id, closedTarget.id, {
        accountingPeriodId: periodId,
        postingDate: '2026-07-04',
        reason: 'Closed target must reject',
        idempotencyKey: 'opening-closed-target-command',
      }),
    ).rejects.toThrow('Closed accounting periods cannot receive postings');
  });
});
