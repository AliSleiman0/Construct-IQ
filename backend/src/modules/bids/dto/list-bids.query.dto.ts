import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BidExtractionStatus } from '../schemas/bid.schema';

export class ListBidsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: BidExtractionStatus })
  @IsOptional()
  @IsEnum(BidExtractionStatus)
  status?: BidExtractionStatus;

  @ApiPropertyOptional({ description: 'Filter by trade package label (exact match)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradePackage?: string;
}
