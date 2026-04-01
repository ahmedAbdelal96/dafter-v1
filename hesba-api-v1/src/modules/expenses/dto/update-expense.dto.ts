import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

/**
 * All fields from CreateExpenseDto become optional.
 * We use PartialType so validation decorators are inherited automatically.
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
