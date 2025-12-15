import { Injectable } from '@nestjs/common';
import { ICategoriesService, Category } from '../types/categories.types';

@Injectable()
export class CategoriesService implements ICategoriesService {
  async validateCategoryExists(
    _name: string,
    _type: 'INCOME' | 'EXPENSE',
  ): Promise<void> {
    // TODO: implement category validation
    // For now, allow any category
    return Promise.resolve();
  }

  async getAllCategories(): Promise<Category[]> {
    // TODO: implement category retrieval
    // For now, return empty array
    return Promise.resolve([]);
  }
}
