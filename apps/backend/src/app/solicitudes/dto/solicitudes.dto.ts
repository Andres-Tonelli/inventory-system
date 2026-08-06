import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  CreateSolicitudDto as ICreateSolicitudDto,
  ResolverSolicitudDto as IResolverSolicitudDto,
} from '@inventory-system/api-contract';

export class CreateSolicitudDto implements ICreateSolicitudDto {
  @IsEnum(['ROTURA', 'ESCASEZ', 'TEMPORAL', 'GENERAL']) tipo!: 'ROTURA' | 'ESCASEZ' | 'TEMPORAL' | 'GENERAL';
  @IsOptional() @IsInt() dominioId?: number;
  
  @IsOptional() @IsInt() articuloId?: number;
  @IsOptional() @IsInt() categoriaId?: number;
  @IsOptional() @IsInt() modeloId?: number;
  @IsOptional() @IsInt() @Min(1) cantidad?: number;
  @IsOptional() @IsString() fechaInicio?: string;
  @IsOptional() @IsString() fechaFin?: string;
  @IsOptional() @IsString() @MaxLength(200) titulo?: string;
  
  @IsString() @MaxLength(1000) motivo!: string;
}

export class ResolverSolicitudDto implements IResolverSolicitudDto {
  @IsEnum(['APROBADA', 'RECHAZADA', 'ENTREGADA']) estado!: 'APROBADA' | 'RECHAZADA' | 'ENTREGADA';
  @IsOptional() @IsString() @MaxLength(1000) observacionesAdmin?: string;
  @IsOptional() @IsString() @MaxLength(100) nuevoEstadoArticuloCodigo?: string;
}
