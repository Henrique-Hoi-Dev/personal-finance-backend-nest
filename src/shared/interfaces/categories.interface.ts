export interface Category {
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface ICategoriesService {
  validateCategoryExists(
    name: string,
    type: 'INCOME' | 'EXPENSE',
  ): Promise<void>;
  getAllCategories(): Promise<Category[]>;
}
