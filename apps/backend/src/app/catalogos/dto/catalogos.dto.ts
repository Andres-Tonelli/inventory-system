import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CreateDominioDto as ICreateDominioDto,
  CreateCategoriaDto as ICreateCategoriaDto,
  CreateMarcaDto as ICreateMarcaDto,
  CreateModeloDto as ICreateModeloDto,
  CreateAtributoDto as ICreateAtributoDto,
  CreateTipoAgrupadorDto as ICreateTipoAgrupadorDto,
  CreateEstadoDto as ICreateEstadoDto,
  UpdateDominioDto as IUpdateDominioDto,
  UpdateCategoriaDto as IUpdateCategoriaDto,
  UpdateMarcaDto as IUpdateMarcaDto,
  UpdateModeloDto as IUpdateModeloDto,
  UpdateTipoAgrupadorDto as IUpdateTipoAgrupadorDto,
  UpdateAtributoDto as IUpdateAtributoDto,
  UpdateEstadoDto as IUpdateEstadoDto,
  TIPO_SEGUIMIENTO,
  TipoSeguimiento,
  DOMINIO_ICONOS,
  DOMINIO_COLORES,
  DominioIcono,
  DominioColor,
} from '@inventory-system/api-contract';

/**
 * DTOs del backend. `implements` la interfaz del contrato compartido: si el contrato cambia,
 * esto NO compila hasta actualizarlo. Los decoradores agregan la validación en runtime (ADR-0006).
 */
export class CreateDominioDto implements ICreateDominioDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsOptional() @IsIn([...DOMINIO_ICONOS]) icono?: DominioIcono;
  @IsOptional() @IsIn([...DOMINIO_COLORES]) color?: DominioColor;
}

export class CreateCategoriaDto implements ICreateCategoriaDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsInt() dominioId!: number;
  @IsOptional() @IsIn([...TIPO_SEGUIMIENTO]) tipoSeguimiento?: TipoSeguimiento;
}

export class CreateMarcaDto implements ICreateMarcaDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsInt() dominioId!: number;
}

export class CreateModeloDto implements ICreateModeloDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsOptional() @IsString() @MaxLength(500) detalle?: string;
  @IsInt() marcaId!: number;
  @IsInt() categoriaId!: number;
  @IsOptional() @IsObject() atributos?: any;
}

export class CreateAtributoDto implements ICreateAtributoDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsString() @MinLength(1) @MaxLength(50) clave!: string;
  @IsString() @MinLength(1) @MaxLength(50) tipoDato!: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) nivel?: string;
}

export class CreateTipoAgrupadorDto implements ICreateTipoAgrupadorDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsOptional() @IsBoolean() asignable?: boolean;
  @IsOptional() @IsArray() @IsInt({ each: true }) categoriaIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) subTipoIds?: number[];
}

export class CreateEstadoDto implements ICreateEstadoDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsOptional() @IsString() @MaxLength(50) codigo?: string;
}

// --- Update DTOs ---

export class UpdateDominioDto implements IUpdateDominioDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
  @IsOptional() @IsIn([...DOMINIO_ICONOS]) icono?: DominioIcono;
  @IsOptional() @IsIn([...DOMINIO_COLORES]) color?: DominioColor;
}

export class UpdateCategoriaDto implements IUpdateCategoriaDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) nombre?: string;
  @IsOptional() @IsIn([...TIPO_SEGUIMIENTO]) tipoSeguimiento?: TipoSeguimiento;
}

export class UpdateMarcaDto implements IUpdateMarcaDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
}

export class UpdateModeloDto implements IUpdateModeloDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) nombre?: string;
  @IsOptional() @IsString() @MaxLength(500) detalle?: string;
  @IsOptional() @IsInt() marcaId?: number;
  @IsOptional() @IsInt() categoriaId?: number;
  @IsOptional() @IsObject() atributos?: any;
}

export class UpdateTipoAgrupadorDto implements IUpdateTipoAgrupadorDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) nombre?: string;
  @IsOptional() @IsBoolean() asignable?: boolean;
  @IsOptional() @IsArray() @IsInt({ each: true }) categoriaIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) subTipoIds?: number[];
}

export class UpdateAtributoDto implements IUpdateAtributoDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) nombre?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) clave?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) tipoDato?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) nivel?: string;
}

export class UpdateEstadoDto implements IUpdateEstadoDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
}
