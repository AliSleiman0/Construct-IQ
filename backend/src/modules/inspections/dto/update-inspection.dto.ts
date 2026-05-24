import { PartialType } from '@nestjs/mapped-types';
import { CreateInspectionDto } from './create-inspection.dto';

// projectId stays optional+immutable in practice; PartialType makes every field
// optional so a PATCH can touch just status / scheduledFor / notes etc.
export class UpdateInspectionDto extends PartialType(CreateInspectionDto) {}
