import { SeedContext } from '../types';

const PRODUCT_CATEGORIES = [
  'Beverages',
  'Dairy',
  'Snacks',
  'Household',
  'Personal Care',
  'Stationery',
  'Frozen Food',
  'Services',
];

const UNIT_OPTIONS = ['pcs', 'kg', 'box', 'pack', 'bottle', 'unit'];

export const seedProducts = async (ctx: SeedContext): Promise<void> => {
  for (const tenant of ctx.tenantStates) {
    const products: Awaited<ReturnType<typeof ctx.prisma.product.create>>[] =
      [];

    for (let i = 0; i < 42; i += 1) {
      const category = PRODUCT_CATEGORIES[i % PRODUCT_CATEGORIES.length];
      const unit = UNIT_OPTIONS[i % UNIT_OPTIONS.length];
      const sku = `${tenant.key.toUpperCase().slice(0, 3)}-${(1000 + i).toString()}`;

      const product = await ctx.prisma.product.create({
        data: {
          companyId: tenant.company.id,
          createdById: tenant.owner.id,
          name: `${category} Product ${i + 1}`,
          description: `Seeded ${category.toLowerCase()} catalog item #${i + 1}`,
          sku,
          category,
          unit,
          unitPrice: 15 + i * 3.25,
          isActive: i % 13 !== 0,
        },
      });

      products.push(product);
    }

    tenant.products = products;
  }
};
