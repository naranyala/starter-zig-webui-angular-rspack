/**
 * DTO Service
 *
 * Data Transfer Object transformations for API communication
 */
import { Injectable } from '@angular/core';
import { PaginatedResponse, ApiResponse } from './data-transform.types';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId?: number;
}

export interface OrderResponse {
  id: number;
  userId: number;
  status: string;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
}

export interface OrderItemResponse {
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: number;
  details?: string[];
}

@Injectable({ providedIn: 'root' })
export class DtoService {
  /**
   * Create user response DTO
   */
  createUserResponse(userData: any): UserResponse {
    return {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      createdAt: this.ensureIsoDate(userData.createdAt),
      updatedAt: userData.updatedAt ? this.ensureIsoDate(userData.updatedAt) : undefined,
    };
  }

  /**
   * Create product response DTO
   */
  createProductResponse(productData: any): ProductResponse {
    return {
      id: productData.id,
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      stock: Number(productData.stock),
      categoryId: productData.category_id,
    };
  }

  /**
   * Create order response DTO
   */
  createOrderResponse(orderData: any): OrderResponse {
    return {
      id: orderData.id,
      userId: orderData.user_id,
      status: orderData.status,
      totalAmount: Number(orderData.total_amount),
      items: orderData.items?.map((item: any) => this.createOrderItemResponse(item)) || [],
      createdAt: this.ensureIsoDate(orderData.created_at),
    };
  }

  /**
   * Create order item response DTO
   */
  createOrderItemResponse(itemData: any): OrderItemResponse {
    return {
      productId: itemData.product_id,
      quantity: Number(itemData.quantity),
      unitPrice: Number(itemData.unit_price),
      subtotal: Number(itemData.subtotal),
    };
  }

  /**
   * Create error response DTO
   */
  createErrorResponse(message: string, code: number, details?: string[]): ErrorResponse {
    return {
      success: false,
      error: message,
      code,
      details,
    };
  }

  /**
   * Create paginated response DTO
   */
  createPaginatedResponse<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResponse<T> {
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Create API response DTO
   */
  createApiResponse<T>(success: boolean, data?: T, message?: string): ApiResponse<T> {
    return {
      success,
      data,
      message,
    };
  }

  /**
   * Transform backend snake_case to frontend camelCase
   */
  snakeToCamel(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.snakeToCamel(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          result[camelKey] = this.snakeToCamel(obj[key]);
        }
      }
      return result;
    }
    return obj;
  }

  /**
   * Transform frontend camelCase to backend snake_case
   */
  camelToSnake(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.camelToSnake(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const snakeKey = key.replace(/[A-Z]/g, (g) => `_${g.toLowerCase()}`);
          result[snakeKey] = this.camelToSnake(obj[key]);
        }
      }
      return result;
    }
    return obj;
  }

  /**
   * Ensure date is ISO string
   */
  private ensureIsoDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return new Date(date).toISOString();
  }
}
