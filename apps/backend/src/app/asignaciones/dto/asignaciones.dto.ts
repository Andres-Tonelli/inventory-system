import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  AsignarArticuloDto as IAsignarArticuloDto,
  AsignarAgrupadorDto as IAsignarAgrupadorDto,
  AsignarConsumibleDto as IAsignarConsumibleDto,
} from '@inventory-system/api-contract';

export class AsignarArticuloDto implements IAsignarArticuloDto {
  @IsInt() articuloId!: number;
  @IsInt() empleadoId!: number;
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}

export class AsignarAgrupadorDto implements IAsignarAgrupadorDto {
  @IsInt() agrupadorId!: number;
  @IsInt() empleadoId!: number;
  @IsOptional() @IsString() @MaxLength(500) observaciones?: string;
}

export class AsignarConsumibleDto implements IAsignarConsumibleDto {
  @IsInt() loteId!: number;
  @IsInt() empleadoId!: number;
  @IsInt() @Min(1) cantidad!: number;
}
