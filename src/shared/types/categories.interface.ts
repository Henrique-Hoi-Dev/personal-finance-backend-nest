export type Category = {
  name: string;
  type: 'INCOME' | 'EXPENSE';
};

export type ICategoriesService = {
  validateCategoryExists(
    name: string,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<void>;
  getAllCategories(): Promise<Category[]>;
};
