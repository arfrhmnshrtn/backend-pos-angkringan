import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf, Matches } from 'class-validator';

export enum AnalysisPeriod {
  TODAY = 'today',
  LAST_7_DAYS = '7days',
  LAST_30_DAYS = '30days',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class SalesAnalysisQueryDto {
  @ApiPropertyOptional({
    description: 'Period for sales analysis. If not provided and custom dates are not set, defaults to 30days.',
    enum: AnalysisPeriod,
    example: '30days',
  })
  @IsOptional()
  @IsEnum(AnalysisPeriod, { message: 'Period harus berupa today, 7days, 30days, month, year, atau custom' })
  period?: string;

  @ApiPropertyOptional({
    description: 'Start date for custom period in YYYY-MM-DD format (WIB)',
    example: '2026-08-01',
  })
  @ValidateIf((o) => o.period === AnalysisPeriod.CUSTOM || (!o.period && o.endDate))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate harus dalam format YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom period in YYYY-MM-DD format (WIB)',
    example: '2026-08-12',
  })
  @ValidateIf((o) => o.period === AnalysisPeriod.CUSTOM || (!o.period && o.startDate))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate harus dalam format YYYY-MM-DD' })
  endDate?: string;
}
