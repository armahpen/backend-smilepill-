import {
  users,
  products,
  categories,
  brands,
  cartItems,
  orders,
  orderItems,
  adminPermissions,
  prescriptions,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type ProductWithRelations,
  type Category,
  type InsertCategory,
  type Brand,
  type InsertBrand,
  type CartItem,
  type InsertCartItem,
  type CartItemWithProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type OrderWithItems,
  type AdminPermission,
  type InsertAdminPermission,
  type UserWithPermissions,
  type Prescription,
  type InsertPrescription,
  type PrescriptionWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithPermissions(id: string): Promise<UserWithPermissions | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  hasAdminPermission(userId: string, permission: string): Promise<boolean>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteAllCategories(): Promise<void>;

  // Brand operations
  getBrands(): Promise<Brand[]>;
  getBrandByName(name: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  deleteAllBrands(): Promise<void>;

  // Product operations
  getProducts(filters?: {
    categoryId?: string;
    brandId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithRelations[]>;
  getProduct(id: string): Promise<ProductWithRelations | undefined>;
  getProductBySlug(slug: string): Promise<ProductWithRelations | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductStock(id: string, quantity: number): Promise<Product>;
  deleteAllProducts(): Promise<void>;
  clearAllData(): Promise<void>;

  // Cart operations
  getCartItems(userId: string): Promise<CartItemWithProduct[]>;
  addToCart(userId: string, productId: string, quantity: number): Promise<CartItem>;
  updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem>;
  removeFromCart(userId: string, productId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Order operations
  getOrders(userId: string): Promise<OrderWithItems[]>;
  getOrder(id: string): Promise<OrderWithItems | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems>;
  
  // Admin operations
  getUserWithPermissions(id: string): Promise<UserWithPermissions | undefined>;
  setUserAdmin(id: string, isAdmin: boolean, role?: string): Promise<User>;
  addAdminPermission(userId: string, permission: string): Promise<AdminPermission>;
  removeAdminPermission(userId: string, permission: string): Promise<void>;
  hasAdminPermission(userId: string, permission: string): Promise<boolean>;
  
  // Product management operations
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Prescription operations
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescriptions(userId?: string): Promise<PrescriptionWithUser[]>;
  getPrescription(id: string): Promise<PrescriptionWithUser | undefined>;
  updatePrescriptionStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<Prescription>;
  updateOrderStatus(id: string, status: string, paymentStatus?: string): Promise<Order>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id || undefined,
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        isAdmin: userData.isAdmin || false,
        adminRole: userData.adminRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async deleteAllCategories(): Promise<void> {
    await db.delete(categories);
  }

  // Brand operations
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(brands.name);
  }

  async getBrandByName(name: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.name, name));
    return brand;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async deleteAllBrands(): Promise<void> {
    await db.delete(brands);
  }

  // Product operations
  async getProducts(filters?: {
    categoryId?: string;
    brandId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithRelations[]> {
    const results = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt));

    return results.map(row => ({
      ...row.products,
      category: row.categories || undefined,
      brand: row.brands || undefined,
    }));
  }

  async getProduct(id: string): Promise<ProductWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, id));

    if (!result) return undefined;

    return {
      ...result.products,
      category: result.categories || undefined,
      brand: result.brands || undefined,
    };
  }

  async getProductBySlug(slug: string): Promise<ProductWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.slug, slug));

    if (!result) return undefined;

    return {
      ...result.products,
      category: result.categories || undefined,
      brand: result.brands || undefined,
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProductStock(id: string, quantity: number): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ stockQuantity: quantity, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteAllProducts(): Promise<void> {
    await db.delete(products);
  }

  async clearAllData(): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await db.delete(orderItems);
    await db.delete(orders);  
    await db.delete(cartItems);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(brands);
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItemWithProduct[]> {
    const results = await db
      .select()
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));

    return results.map(row => ({
      ...row.cart_items,
      product: {
        ...row.products,
        category: row.categories || undefined,
        brand: row.brands || undefined,
      },
    }));
  }

  async addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));

    if (existingItem) {
      // Update existing item
      const [updatedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Create new cart item
      const [newItem] = await db
        .insert(cartItems)
        .values({
          userId,
          productId,
          quantity,
        })
        .returning();
      return newItem;
    }
  }

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .returning();
    return updatedItem;
  }

  async removeFromCart(userId: string, productId: string): Promise<void> {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Order operations
  async getOrders(userId: string): Promise<OrderWithItems[]> {
    const ordersWithItems = await db
      .select({
        order: orders,
        orderItem: orderItems,
        product: products,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // Group by order
    const groupedOrders: Record<string, OrderWithItems> = {};
    
    for (const row of ordersWithItems) {
      const orderId = row.order.id;
      
      if (!groupedOrders[orderId]) {
        groupedOrders[orderId] = {
          ...row.order,
          orderItems: [],
        };
      }
      
      if (row.orderItem && row.product) {
        groupedOrders[orderId].orderItems.push({
          ...row.orderItem,
          product: row.product,
        });
      }
    }

    return Object.values(groupedOrders);
  }

  async getOrder(id: string): Promise<OrderWithItems | undefined> {
    const orderWithItems = await db
      .select({
        order: orders,
        orderItem: orderItems,
        product: products,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.id, id));

    if (orderWithItems.length === 0) {
      return undefined;
    }

    const order = orderWithItems[0].order;
    const items = orderWithItems
      .filter((row) => row.orderItem && row.product)
      .map((row) => ({
        ...row.orderItem!,
        product: row.product!,
      }));

    return {
      ...order,
      orderItems: items,
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    const orderItemsWithOrderId = items.map((item) => ({
      ...item,
      orderId: newOrder.id,
    }));
    
    const newOrderItems = await db.insert(orderItems).values(orderItemsWithOrderId).returning();
    
    // Fetch products for the order items
    const productIds = newOrderItems.map((item) => item.productId);
    const orderProducts = await db
      .select()
      .from(products)
      .where(sql`${products.id} = ANY(${productIds})`);

    const orderItemsWithProducts = newOrderItems.map((item) => ({
      ...item,
      product: orderProducts.find((product) => product.id === item.productId)!,
    }));

    return {
      ...newOrder,
      orderItems: orderItemsWithProducts,
    };
  }

  async updateOrderStatus(id: string, status: string, paymentStatus?: string): Promise<Order> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    return updatedOrder;
  }

  // Admin operations implementation
  async getUserWithPermissions(id: string): Promise<UserWithPermissions | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        adminPermissions: true,
      },
    });
    return user;
  }

  async setUserAdmin(id: string, isAdmin: boolean, role?: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ 
        isAdmin, 
        adminRole: role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async addAdminPermission(userId: string, permission: string): Promise<AdminPermission> {
    const [adminPermission] = await db.insert(adminPermissions)
      .values({ userId, permission })
      .returning();
    return adminPermission;
  }

  async removeAdminPermission(userId: string, permission: string): Promise<void> {
    await db.delete(adminPermissions)
      .where(and(
        eq(adminPermissions.userId, userId),
        eq(adminPermissions.permission, permission)
      ));
  }

  async hasAdminPermission(userId: string, permission: string): Promise<boolean> {
    const permission_record = await db.query.adminPermissions.findFirst({
      where: and(
        eq(adminPermissions.userId, userId),
        eq(adminPermissions.permission, permission)
      ),
    });
    return !!permission_record;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [newPrescription] = await db.insert(prescriptions)
      .values(prescription)
      .returning();
    return newPrescription;
  }

  async getPrescriptions(userId?: string): Promise<PrescriptionWithUser[]> {
    if (userId) {
      const results = await db.query.prescriptions.findMany({
        where: eq(prescriptions.userId, userId),
        with: {
          user: true,
          reviewer: true,
        },
        orderBy: [desc(prescriptions.createdAt)],
      });
      return results.filter(r => r.user) as PrescriptionWithUser[];
    } else {
      const results = await db.query.prescriptions.findMany({
        with: {
          user: true,
          reviewer: true,
        },
        orderBy: [desc(prescriptions.createdAt)],
      });
      return results.filter(r => r.user) as PrescriptionWithUser[];
    }
  }

  async getPrescription(id: string): Promise<PrescriptionWithUser | undefined> {
    const result = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, id),
      with: {
        user: true,
        reviewer: true,
      },
    });
    if (!result || !result.user) return undefined;
    return result as PrescriptionWithUser;
  }

  async updatePrescriptionStatus(
    id: string, 
    status: string, 
    reviewNotes?: string, 
    reviewedBy?: string
  ): Promise<Prescription> {
    const [prescription] = await db.update(prescriptions)
      .set({ 
        status, 
        reviewNotes,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();
    return prescription;
  }
}

export const storage = new DatabaseStorage();
