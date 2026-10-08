// ============================================
// UpdatePlanDto — Partial update of a plan
// ============================================

import { PartialType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';

/**
 * All fields are optional — only changed fields need to be sent
 * PartialType inherits all validators + Swagger docs from CreatePlanDto
 */
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
