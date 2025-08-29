import * as fs from 'fs';
import type { IStorage } from './storage';

// Read the extracted catalog data
const catalogData = JSON.parse(fs.readFileSync('catalog_data.json', 'utf8'));

export async function seedAuthenticCatalog(storage: IStorage) {
  console.log(`Seeding authentic catalog with ${catalogData.length} products...`);

  // Create categories from catalog data
  const categoriesData = [
    { name: "Vitamins & Multivitamins", slug: "vitamins-multivitamins", description: "Essential vitamins and multivitamin supplements for daily health" },
    { name: "Probiotics & Digestive Health", slug: "probiotics-digestive-health", description: "Probiotic supplements and digestive health products" },
    { name: "Dietary Supplements", slug: "dietary-supplements", description: "General dietary and nutritional supplements" },
    { name: "Joint, Bone & Muscle Support", slug: "joint-bone-muscle-support", description: "Supplements for joint, bone and muscle health" },
    { name: "Hair, Skin & Nails", slug: "hair-skin-nails", description: "Beauty supplements for hair, skin and nail health" },
    { name: "Pain Relief", slug: "pain-relief", description: "Over-the-counter pain relief medications" },
    { name: "Cold, Cough & Allergy", slug: "cold-cough-allergy", description: "Cold, cough and allergy relief medications" },
    { name: "Urinary Health & Cranberry", slug: "urinary-health-cranberry", description: "Urinary tract health and cranberry supplements" },
    { name: "Skin Care & Acne", slug: "skin-care-acne", description: "Topical skin care and acne treatment products" },
    { name: "Women's Health & Feminine Care", slug: "womens-health-feminine-care", description: "Women's health and feminine care products" },
    { name: "First Aid & Wound Care", slug: "first-aid-wound-care", description: "First aid supplies and wound care products" },
    { name: "Digestive & Antacid", slug: "digestive-antacid", description: "Digestive aids and antacid medications" },
    { name: "Heart Health & CoQ10", slug: "heart-health-coq10", description: "Heart health supplements including CoQ10" },
    { name: "Oral Care", slug: "oral-care", description: "Oral and dental care products" },
    { name: "Minerals & Trace Elements", slug: "minerals-trace-elements", description: "Important minerals and trace elements for optimal body function" },
    { name: "Herbal & Natural Supplements", slug: "herbal-natural-supplements", description: "Natural herbal supplements and botanical extracts" },
    { name: "General Health", slug: "general-health", description: "General health and wellness products" }
  ];

  const categories: Record<string, any> = {};
  for (const categoryData of categoriesData) {
    categories[categoryData.slug] = await storage.createCategory(categoryData);
  }

  // Create brands from catalog data
  const uniqueBrands = [...new Set(catalogData.map((item: any) => item.Brand || 'Generic'))];
  const brands: Record<string, any> = {};
  
  for (const brandName of uniqueBrands) {
    const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    brands[brandSlug] = await storage.createBrand({
      name: brandName,
      description: `Quality ${brandName} pharmaceutical products`
    });
  }

  // Create products from catalog data with Google Drive image links
  const products = [];
  const processedProducts = new Set(); // Avoid duplicates

  for (const item of catalogData) {
    const productName = item.ProductName || 'Unknown Product';
    const brand = item.Brand || 'Generic';
    const category = item.Category || 'General Health';
    const price = item['Price(Ghc)'] || 0;
    const imageUrl = item.Direct_Link || '';

    // Create unique key to avoid duplicates
    const productKey = `${productName}-${brand}-${price}`;
    if (processedProducts.has(productKey)) {
      continue;
    }
    processedProducts.add(productKey);

    // Find matching category
    let categoryObj = null;
    for (const [slug, cat] of Object.entries(categories)) {
      if (cat.name === category) {
        categoryObj = cat;
        break;
      }
    }
    
    // Fallback to general health if category not found
    if (!categoryObj) {
      categoryObj = categories['general-health'];
    }

    // Find matching brand
    const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const brandObj = brands[brandSlug] || brands['generic'];

    const productSlug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    const product = {
      name: productName,
      slug: `${productSlug}-${products.length}`, // Ensure uniqueness
      description: `${productName} - Premium ${brand} product for your health needs.`,
      shortDescription: productName.length > 50 ? productName.substring(0, 50) + '...' : productName,
      price: price.toString(),
      dosage: extractDosage(productName),
      categoryId: categoryObj.id,
      brandId: brandObj.id,
      imageUrl: imageUrl, // Google Drive direct link
      stockQuantity: Math.floor(Math.random() * 150) + 50,
      requiresPrescription: isPrescriptionRequired(productName, category),
      rating: (Math.random() * 2 + 3).toFixed(1),
      reviewCount: Math.floor(Math.random() * 500) + 50
    };

    const createdProduct = await storage.createProduct(product);
    products.push(createdProduct);
    console.log(`Created product: ${productName}`);
  }

  return {
    categories: Object.keys(categories).length,
    brands: Object.keys(brands).length,
    products: products.length
  };
}

function extractDosage(productName: string): string {
  const dosageMatch = productName.match(/(\d+\s*(mg|mcg|g|ml|tablets?|capsules?|count|ct))/i);
  return dosageMatch ? dosageMatch[0] : 'As directed';
}

function isPrescriptionRequired(productName: string, category: string): boolean {
  const prescriptionKeywords = ['prescription', 'rx', 'antibiotic', 'steroid'];
  const productLower = productName.toLowerCase();
  return prescriptionKeywords.some(keyword => productLower.includes(keyword));
}