import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePluggyItemIdDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;
}

