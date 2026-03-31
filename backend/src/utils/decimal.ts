import { Prisma } from '@prisma/client';

export const toDecimal = (value: number | string | Prisma.Decimal): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

export const toNumber = (value: Prisma.Decimal | number | string): number =>
  value instanceof Prisma.Decimal ? value.toNumber() : Number(value);
