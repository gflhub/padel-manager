'use server';

import { prisma } from '@/lib/db/prisma';

/**
 * Product Repository
 *
 * Handles all data access and business logic for product catalog.
 * Manages product creation, updates, inventory, pricing, and queries.
 */

export interface Product {
  id: string;
  club_id: string;
  name: string;
  category: 'bebidas' | 'lanches' | 'doces' | 'outros';
  price: number;
  stock?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all products for a club.
 * @param clubId - Club ID
 * @param category - Optional category filter
 * @returns Products list or error
 */
export async function getProductsByClub(
  clubId: string,
  category?: string
): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const products = await prisma.product.findMany({
      where: {
        clubId,
        ...(category && { category: category as any }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return { data: products as Product[], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar produtos';
    return { data: null, error: message };
  }
}

/**
 * Get a product by ID.
 * @param productId - Product ID
 * @param clubId - Club ID (for authorization)
 * @returns Product or error
 */
export async function getProductById(productId: string, clubId: string): Promise<{ data: Product | null; error: string | null }> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.clubId !== clubId) {
      return { data: null, error: 'Produto não encontrado' };
    }

    return { data: product as Product, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar produto';
    return { data: null, error: message };
  }
}

/**
 * Create a new product.
 * @param clubId - Club ID
 * @param name - Product name
 * @param category - Product category
 * @param price - Product price
 * @param stock - Product stock (optional)
 * @param active - Whether product is active
 * @returns Created product or error
 */
export async function createProduct(
  clubId: string,
  name: string,
  category: string,
  price: number,
  stock?: number,
  active: boolean = true
): Promise<{ data: Product | null; error: string | null }> {
  try {
    if (!name?.trim()) {
      return { data: null, error: 'Nome do produto é obrigatório' };
    }

    if (price < 0) {
      return { data: null, error: 'Preço não pode ser negativo' };
    }

    const product = await prisma.product.create({
      data: {
        clubId,
        name: name.trim(),
        category: category as any,
        price: price,
        available: active,
      },
    });

    return { data: product as Product, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar produto';
    return { data: null, error: message };
  }
}

/**
 * Update a product.
 * @param productId - Product ID
 * @param clubId - Club ID (for authorization)
 * @param updates - Fields to update
 * @returns Updated product or error
 */
export async function updateProduct(
  productId: string,
  clubId: string,
  updates: Partial<Omit<Product, 'id' | 'club_id' | 'created_at'>>
): Promise<{ data: Product | null; error: string | null }> {
  try {
    // Verify authorization
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { data: null, error: 'Produto não encontrado' };
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return { data: product as Product, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar produto';
    return { data: null, error: message };
  }
}

/**
 * Delete a product.
 * @param productId - Product ID
 * @param clubId - Club ID (for authorization)
 * @returns Error or null
 */
export async function deleteProduct(productId: string, clubId: string): Promise<{ error: string | null }> {
  try {
    // Verify authorization
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { error: 'Produto não encontrado' };
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar produto';
    return { error: message };
  }
}
