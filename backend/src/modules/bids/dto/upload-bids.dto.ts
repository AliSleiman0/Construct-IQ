import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadBidsDto {
  @ApiProperty({ description: 'Project the bids belong to' })
  @IsString()
  @MinLength(1)
  projectId!: string;

  @ApiProperty({
    description: 'Trade package label, e.g. "Electrical - Block A"',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  tradePackage!: string;
}
