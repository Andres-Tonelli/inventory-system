import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import {
  CreateArticuloDto as ICreateArticuloDto,
  CreateLoteDto as ICreateLoteDto,
  AjusteStockDto as IAjusteStockDto,
  UpdateEstadoArticuloDto as IUpdateEstadoArticuloDto,
  UpdateArticuloDto as IUpdateArticuloDto,
} from '@inventory-system/api-contract';

export class CreateArticuloDto implements ICreateArticuloDto {
  @IsOptional() @IsString() @MaxLength(200) nroSerie?: string | null;
  @IsOptional() @IsString() @MaxLength(200) alias?: string | null;
  @IsOptional() @IsString() @MaxLength(500) detalle?: string | null;
  @IsInt() modeloId!: number;
  @IsOptional() @IsString() @MaxLength(50) estadoCodigo?: string;
  @IsOptional() @IsObject() atributos?: Record<string, unknown>;
}

export class UpdateArticuloDto implements IUpdateArticuloDto {
  @IsOptional() @IsString() @MaxLength(200) nroSerie?: string | null;
  @IsOptional() @IsString() @MaxLength(200) alias?: string | null;
  @IsOptional() @IsString() @MaxLength(500) detalle?: string | null;
  @IsOptional() @IsInt() modeloId?: number;
  @IsOptional() @IsObject() atributos?: Record<string, unknown>;
}

export class CreateLoteDto implements ICreateLoteDto {
  @IsInt() @Min(0) cantidadDisponible!: number;
  @IsInt() modeloId!: number;
  @IsOptional() @IsString() @MaxLength(200) referencia?: string;
  @IsOptional() @IsObject() atributos?: any;
}

export class AjusteStockDto implements IAjusteStockDto {
  @IsInt() @Min(1) cantidad!: number;
}

export class UpdateEstadoArticuloDto implements IUpdateEstadoArticuloDto {
  @IsString() @MinLength(1) @MaxLength(50) estadoCodigo!: string;
}
