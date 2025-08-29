import type { Express } from "express";
import { createServer, type Server } from "http";
import { ObjectStorageService } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { insertProductSchema, insertPrescriptionSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
// Import removed multer as it's not needed for object storage

// Enhanced authentication middleware that supports both session types
const isAuthenticatedEnhanced = async (req: any, res: any, next: any) => {
  // Check for traditional session-based auth first
  if ((req.session as any)?.userId) {
    const user = await storage.getUserById((req.session as any).userId);
    if (user) {
      (req as any).user = { claims: { sub: user.id }, ...user };
      return next();
    }
  }
  
  // Fall back to Replit auth
  return isAuthenticated(req, res, next);
};

// Admin middleware to check if user has admin permissions
const isAdmin = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Handle both auth types
  const userId = req.user.claims?.sub || req.user.id;
  const user = await storage.getUserWithPermissions(userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.adminUser = user;
  next();
};

const checkAdminPermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    if (!req.adminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hasPermission = await storage.hasAdminPermission(req.adminUser.id, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: `Permission '${permission}' required` });
    }

    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Render
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Auth middleware
  await setupAuth(app);

  // Traditional username/password authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      (req.session as any).userId = user.id;
      
      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "Login successful", 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
      });

      // Set session
      (req.session as any).userId = newUser.id;

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.json({ 
        message: "Registration successful", 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticatedEnhanced, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public object serving endpoint
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin upload endpoint for product images
  app.post("/api/admin/objects/upload", isAuthenticated, isAdmin, checkAdminPermission('edit_products'), async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Admin set product image endpoint
  app.put("/api/admin/product-images", isAuthenticated, isAdmin, checkAdminPermission('edit_products'), async (req, res) => {
    if (!req.body.imageURL || !req.body.productId) {
      return res.status(400).json({ error: "imageURL and productId are required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.setProductImagePolicy(req.body.imageURL);
      
      // Update the product with new image
      await storage.updateProduct(req.body.productId, { imageUrl: objectPath });

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin product management endpoints
  app.get("/api/admin/products", isAuthenticated, isAdmin, checkAdminPermission('edit_products'), async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json({ products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/products/:id", isAuthenticated, isAdmin, checkAdminPermission('edit_products'), async (req, res) => {
    try {
      const updateData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, updateData);
      res.json({ product });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.post("/api/admin/products", isAuthenticated, isAdmin, checkAdminPermission('add_products'), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json({ product });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.delete("/api/admin/products/:id", isAuthenticated, isAdmin, checkAdminPermission('edit_products'), async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Admin prescription management endpoints
  app.get("/api/admin/prescriptions", isAuthenticated, isAdmin, checkAdminPermission('view_prescriptions'), async (req, res) => {
    try {
      const prescriptions = await storage.getPrescriptions();
      res.json({ prescriptions });
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/prescriptions/:id/status", isAuthenticated, isAdmin, checkAdminPermission('view_prescriptions'), async (req, res) => {
    const { status, reviewNotes } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    try {
      const prescription = await storage.updatePrescriptionStatus(
        req.params.id,
        status,
        reviewNotes,
        (req as any).adminUser.id
      );
      res.json({ prescription });
    } catch (error) {
      console.error("Error updating prescription status:", error);
      res.status(500).json({ error: "Failed to update prescription" });
    }
  });

  // Admin user management endpoints
  app.post("/api/admin/users/:id/admin", isAuthenticated, isAdmin, checkAdminPermission('manage_users'), async (req, res) => {
    const { isAdmin: makeAdmin, role } = req.body;
    try {
      const user = await storage.setUserAdmin(req.params.id, makeAdmin, role);
      res.json({ user });
    } catch (error) {
      console.error("Error setting user admin status:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:id/permissions", isAuthenticated, isAdmin, checkAdminPermission('manage_users'), async (req, res) => {
    const { permission } = req.body;
    if (!permission) {
      return res.status(400).json({ error: "Permission is required" });
    }

    try {
      const adminPermission = await storage.addAdminPermission(req.params.id, permission);
      res.json({ adminPermission });
    } catch (error) {
      console.error("Error adding admin permission:", error);
      res.status(500).json({ error: "Failed to add permission" });
    }
  });

  // Check if current user is admin
  app.get("/api/admin/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserWithPermissions((req as any).user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Not an admin" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Regular prescription submission (non-admin)
  app.post("/api/prescriptions/submit", isAuthenticated, async (req, res) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse({
        ...req.body,
        userId: (req as any).user.claims.sub,
      });

      const prescription = await storage.createPrescription(prescriptionData);
      res.json({ prescription });
    } catch (error) {
      console.error("Error submitting prescription:", error);
      res.status(500).json({ error: "Failed to submit prescription" });
    }
  });

  // Existing routes...
  app.get("/api/products", async (req, res) => {
    try {
      const {
        categoryId,
        brandId,
        search,
        minPrice,
        maxPrice,
        inStock,
        limit = 50,
        offset = 0,
      } = req.query;

      const filters: any = {};
      
      if (categoryId) filters.categoryId = categoryId as string;
      if (brandId) filters.brandId = brandId as string;
      if (search) filters.search = search as string;
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
      if (inStock !== undefined) filters.inStock = inStock === 'true';
      filters.limit = parseInt(limit as string);
      filters.offset = parseInt(offset as string);

      const products = await storage.getProducts(filters);
      res.json({ products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}