import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyReportDto } from './create-daily-report.dto';

export class UpdateDailyReportDto extends PartialType(CreateDailyReportDto) {}
