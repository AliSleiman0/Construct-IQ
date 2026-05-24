import { PartialType } from '@nestjs/mapped-types';
import { CreatePhaseDto } from './create-phase.dto';

// PATCH reuses the create fields but makes them all optional (so `name` is not
// required on update), matching the projects module's PartialType pattern.
export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {}
