import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CreateAgrupadorDto as ICreateAgrupadorDto,
  AddArticuloAgrupadorDto as IAddArticuloAgrupadorDto,
  AddSubAgrupadorDto as IAddSubAgrupadorDto,
} from '@inventory-system/api-contract';

export class CreateAgrupadorDto implements ICreateAgrupadorDto {
  @IsString() @MinLength(1) @MaxLength(150) nombre!: string;
  @IsInt() tipoAgrupadorId!: number;
  @IsOptional() @IsInt() agrupadorPadreId?: number;
}

export class AddArticuloAgrupadorDto implements IAddArticuloAgrupadorDto {
  @IsInt() articuloId!: number;
}

export class AddSubAgrupadorDto implements IAddSubAgrupadorDto {
  @IsInt() childAgrupadorId!: number;
}
