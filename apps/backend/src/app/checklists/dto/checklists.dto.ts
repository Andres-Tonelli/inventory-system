import { IsInt, IsOptional, IsString, MaxLength, IsArray, ValidateNested, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateAspectoDto as ICreateAspectoDto,
  CreateChecklistDto as ICreateChecklistDto,
  CreateChecklistInstanciaDto as ICreateChecklistInstanciaDto,
  CreateChecklistValorDto as ICreateChecklistValorDto,
} from '@inventory-system/api-contract';

export class CreateAspectoDto implements ICreateAspectoDto {
  @IsString()
  @MaxLength(100)
  nombre!: string;
}

export class ChecklistItemDto {
  @IsString()
  @MaxLength(500)
  pregunta!: string;

  @IsInt()
  orden!: number;
}

export class CreateChecklistDto implements ICreateChecklistDto {
  @IsInt()
  dominioId!: number;

  @IsString()
  @MaxLength(200)
  titulo!: string;

  @IsInt()
  aspectoId!: number;

  @IsString()
  @IsIn(['ARTICULO', 'AGRUPADOR'])
  ambito!: 'ARTICULO' | 'AGRUPADOR';

  @IsOptional()
  @IsInt()
  categoriaId?: number | null;

  @IsOptional()
  @IsInt()
  tipoAgrupadorId?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[];
}

export class CreateChecklistValorDto implements ICreateChecklistValorDto {
  @IsInt()
  checklistItemId!: number;

  @IsBoolean()
  valor!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string | null;
}

export class CreateChecklistInstanciaDto implements ICreateChecklistInstanciaDto {
  @IsInt()
  checklistId!: number;

  @IsOptional()
  @IsInt()
  articuloId?: number | null;

  @IsOptional()
  @IsInt()
  agrupadorId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsable?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistValorDto)
  valores!: CreateChecklistValorDto[];
}
