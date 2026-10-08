import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'raw_response';

/**
 * Marks an endpoint as an intentional raw-response exception.
 * Global success response shaping interceptor will skip these handlers.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
