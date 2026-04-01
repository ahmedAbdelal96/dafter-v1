// ============================================================
// UpdateProductDto — All fields optional (PartialType pattern)
// ============================================================

import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * All fields from CreateProductDto become optional.
 * Only the fields present in the request body are updated.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
