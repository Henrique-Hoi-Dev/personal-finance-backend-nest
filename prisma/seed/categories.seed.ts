import { PrismaClient } from '@prisma/client';

export interface CategorySeedItem {
  name: string;
  description: string;
  type: 'EXPENSE' | 'INCOME';
  isDefault: boolean;
  ptBr: string;
  en: string;
}

const DEFAULT_CATEGORIES: CategorySeedItem[] = [
  // EXPENSE categories
  {
    name: 'FOOD',
    description: 'Gastos com comida, restaurantes e supermercado',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Alimentação',
    en: 'Food',
  },
  {
    name: 'TRANSPORT',
    description: 'Gastos com transporte, combustível e passagens',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Transporte',
    en: 'Transport',
  },
  {
    name: 'ENTERTAINMENT',
    description: 'Gastos com entretenimento, lazer e diversão',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Entretenimento',
    en: 'Entertainment',
  },
  {
    name: 'RENT',
    description: 'Gastos com moradia, aluguel e condomínio',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Moradia',
    en: 'Rent',
  },
  {
    name: 'HEALTH',
    description: 'Gastos com saúde, medicamentos e consultas',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Saúde',
    en: 'Health',
  },
  {
    name: 'ACCOUNT_PAYMENT',
    description: 'Pagamento de contas e serviços',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Pagamento de Conta',
    en: 'Account Payment',
  },
  {
    name: 'INSTALLMENT_PAYMENT',
    description: 'Pagamento de parcelas e financiamentos',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Pagamento de Parcela',
    en: 'Installment Payment',
  },
  {
    name: 'UTILITIES',
    description: 'Gastos com utilidades, água, luz e internet',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Utilidades',
    en: 'Utilities',
  },
  {
    name: 'EDUCATION',
    description: 'Gastos com educação, cursos e material escolar',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Educação',
    en: 'Education',
  },
  {
    name: 'SHOPPING',
    description: 'Gastos com compras e produtos diversos',
    type: 'EXPENSE',
    isDefault: true,
    ptBr: 'Compras',
    en: 'Shopping',
  },
  // INCOME categories
  {
    name: 'SALARY',
    description: 'Recebimento de salário e remuneração fixa',
    type: 'INCOME',
    isDefault: true,
    ptBr: 'Salário',
    en: 'Salary',
  },
  {
    name: 'FREELANCE',
    description: 'Recebimento de trabalhos freelancer e projetos',
    type: 'INCOME',
    isDefault: true,
    ptBr: 'Freelance',
    en: 'Freelance',
  },
  {
    name: 'INVESTMENT',
    description: 'Recebimento de investimentos e dividendos',
    type: 'INCOME',
    isDefault: true,
    ptBr: 'Investimentos',
    en: 'Investment',
  },
  {
    name: 'REFUND',
    description: 'Recebimento de reembolsos e devoluções',
    type: 'INCOME',
    isDefault: true,
    ptBr: 'Reembolso',
    en: 'Refund',
  },
  {
    name: 'OTHER',
    description: 'Outras receitas e ganhos diversos',
    type: 'INCOME',
    isDefault: true,
    ptBr: 'Outros',
    en: 'Other',
  },
];

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Seeding transaction categories...');

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.transactionCategory.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {
        description: category.description,
        isDefault: category.isDefault,
        ptBr: category.ptBr,
        en: category.en,
      },
      create: {
        name: category.name,
        description: category.description,
        type: category.type,
        isDefault: category.isDefault,
        ptBr: category.ptBr,
        en: category.en,
      },
    });
  }

  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} transaction categories`);
}

