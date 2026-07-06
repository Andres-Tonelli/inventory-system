import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  CreateAreaDto as ICreateAreaDto,
  CreateEmpleadoDto as ICreateEmpleadoDto,
  LoginDto as ILoginDto,
  UpdateAreaDto as IUpdateAreaDto,
  UpdateEmpleadoDto as IUpdateEmpleadoDto,
} from '@inventory-system/api-contract';

export class CreateAreaDto implements ICreateAreaDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
}

export class CreateEmpleadoDto implements ICreateEmpleadoDto {
  @IsString() @MinLength(1) @MaxLength(150) nombre!: string;
  @IsString() @MinLength(1) @MaxLength(50) legajo!: string;
  @IsInt() areaId!: number;
}

export class LoginDto implements ILoginDto {
  @IsString() @MinLength(1) @MaxLength(50) legajo!: string;
}

// --- Update DTOs ---

export class UpdateAreaDto implements IUpdateAreaDto {
  @IsString() @MinLength(1) @MaxLength(100) nombre!: string;
}

export class UpdateEmpleadoDto implements IUpdateEmpleadoDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(150) nombre?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) legajo?: string;
  @IsOptional() @IsInt() areaId?: number;
}
