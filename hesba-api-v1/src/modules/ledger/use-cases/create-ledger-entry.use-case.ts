import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { LedgerRepository } from '../ledger.repository';
import { CreateLedgerEntryDto } from '../dto';
import { TranslationService } from '../../../common/services/translation.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EntitlementService } from '../../../common/entitlements/entitlement.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

const ENTRY_TYPE_AR: Record<LedgerEntryType, string> = {
  INVOICE: 'فاتورة',
  PAYMENT: 'دفعة',
  RETURN: 'مرتجع',
  ADJUSTMENT: 'تسوية',
  ADVANCE: 'سلفة',
  SALARY_PAYMENT: 'راتب',
  DEDUCTION: 'خصم',
  SETTLEMENT: 'تسوية نهائية',
};

@Injectable()
export class CreateLedgerEntryUseCase {
  private readonly logger = new Logger(CreateLedgerEntryUseCase.name);

  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly t: TranslationService,
    private readonly notifService: NotificationsService,
    private readonly entitlementService: EntitlementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(companyId: string, actorUserId: string, dto: CreateLedgerEntryDto) {
    if (dto.signedAmount === 0) {
      throw new BadRequestException(this.t.translate('ledger.create.zeroAmount'));
    }

    const entryDateObj = new Date(dto.entryDate);
    entryDateObj.setUTCHours(0, 0, 0, 0);

    let dueDateObj: Date | null = null;
    if (dto.dueDate) {
      dueDateObj = new Date(dto.dueDate);
      dueDateObj.setUTCHours(0, 0, 0, 0);
      if (dueDateObj < entryDateObj) {
        throw new BadRequestException(
          this.t.translate('ledger.create.invalidDueDate'),
        );
      }
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      await this.entitlementService.assertQuota(companyId, 'ledgerEntries', tx);

      const partyFound = await this.ledgerRepository.partyExists(
        companyId,
        dto.partyType,
        dto.partyId,
        tx,
      );
      if (!partyFound) {
        throw new NotFoundException(this.t.translate('ledger.create.partyNotFound'));
      }

      return this.ledgerRepository.createEntryWithTx(
        {
          companyId,
          partyType: dto.partyType,
          partyId: dto.partyId,
          entryType: dto.entryType,
          signedAmount: dto.signedAmount,
          entryDate: entryDateObj,
          dueDate: dueDateObj,
          note: dto.note ?? null,
          actorUserId,
        },
        tx,
      );
    });

    const entryLabel = ENTRY_TYPE_AR[entry.entryType] ?? entry.entryType;
    const amount = Math.abs(Number(entry.signedAmount)).toFixed(2);
    this.notifService
      .send({
        userId: actorUserId,
        companyId,
        type: 'ledger.entry.created',
        title: 'قيد جديد',
        body: `تم إضافة ${entryLabel} بمبلغ ${amount} ج.م`,
        data: { screen: 'LedgerDetail', entryId: entry.id },
      })
      .catch((err: Error) =>
        this.logger.error(
          `Ledger notification failed: ${err.message}`,
          err.stack,
        ),
      );

    return entry;
  }
}
