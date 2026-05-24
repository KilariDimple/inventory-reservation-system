import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  // ─── Create Warehouses ─────────────────────────────────

  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Central Hub", location: "Mumbai, Maharashtra" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi NCR Warehouse", location: "Gurugram, Haryana" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Tech Park", location: "Whitefield, Bangalore" },
    }),
    prisma.warehouse.create({
      data: { name: "Hyderabad Logistics Center", location: "Shamshabad, Hyderabad" },
    }),
    prisma.warehouse.create({
      data: { name: "Chennai Distribution Hub", location: "Sriperumbudur, Chennai" },
    }),
    prisma.warehouse.create({
      data: { name: "Kolkata East Depot", location: "Salt Lake, Kolkata" },
    }),
    prisma.warehouse.create({
      data: { name: "Pune Smart Warehouse", location: "Hinjewadi, Pune" },
    }),
    prisma.warehouse.create({
      data: { name: "Ahmedabad Fulfillment Center", location: "Sanand, Ahmedabad" },
    }),
  ]);

  console.log(`Created ${warehouses.length} warehouses`);

  // ─── Create Products ───────────────────────────────────

  const productData = [
    // Smartphones
    { name: "iPhone 15 Pro Max", description: "Apple iPhone 15 Pro Max with A17 Pro chip, 256GB, Natural Titanium", price: 159900 },
    { name: "Samsung Galaxy S24 Ultra", description: "Samsung Galaxy S24 Ultra with Snapdragon 8 Gen 3, 256GB, Titanium Gray", price: 129999 },
    { name: "Google Pixel 8 Pro", description: "Google Pixel 8 Pro with Tensor G3, 128GB, Bay Blue", price: 106999 },
    { name: "OnePlus 12", description: "OnePlus 12 with Snapdragon 8 Gen 3, 256GB, Flowy Emerald", price: 64999 },
    { name: "Samsung Galaxy Z Fold5", description: "Samsung Galaxy Z Fold5 with Snapdragon 8 Gen 2, 256GB, Icy Blue", price: 154999 },
    { name: "iPhone 15", description: "Apple iPhone 15 with A16 Bionic, 128GB, Blue", price: 79900 },
    { name: "Xiaomi 14 Ultra", description: "Xiaomi 14 Ultra with Snapdragon 8 Gen 3, Leica cameras, 512GB", price: 99999 },
    { name: "Nothing Phone (2)", description: "Nothing Phone (2) with Snapdragon 8+ Gen 1, 256GB, Dark Grey", price: 44999 },

    // Laptops
    { name: "MacBook Air M3", description: "Apple MacBook Air 15-inch with M3 chip, 16GB RAM, 512GB SSD", price: 149900 },
    { name: "MacBook Pro M3 Pro", description: "Apple MacBook Pro 14-inch with M3 Pro chip, 18GB RAM, 512GB SSD", price: 199900 },
    { name: "Dell XPS 15", description: "Dell XPS 15 with Intel Core i7-13700H, 16GB RAM, 512GB SSD, OLED display", price: 159990 },
    { name: "ThinkPad X1 Carbon Gen 11", description: "Lenovo ThinkPad X1 Carbon with Intel i7, 16GB RAM, 512GB SSD", price: 145000 },
    { name: "ASUS ROG Zephyrus G14", description: "ASUS ROG Zephyrus G14 with AMD Ryzen 9, RTX 4060, 16GB RAM", price: 139990 },
    { name: "HP Spectre x360", description: "HP Spectre x360 14-inch 2-in-1 with Intel Evo, 16GB RAM, OLED", price: 134999 },

    // Audio
    { name: "Sony WH-1000XM5", description: "Premium noise-cancelling wireless headphones with 30hr battery life", price: 29990 },
    { name: "AirPods Pro 2", description: "Apple AirPods Pro with USB-C, Active Noise Cancellation, Adaptive Audio", price: 24900 },
    { name: "AirPods Max", description: "Apple AirPods Max over-ear headphones with spatial audio, Silver", price: 59900 },
    { name: "Sony WF-1000XM5", description: "Sony WF-1000XM5 truly wireless noise-cancelling earbuds", price: 19990 },
    { name: "Bose QuietComfort Ultra", description: "Bose QuietComfort Ultra headphones with immersive audio", price: 34900 },
    { name: "JBL Flip 6", description: "JBL Flip 6 portable Bluetooth speaker, waterproof, 12hr battery", price: 9999 },
    { name: "Marshall Stanmore III", description: "Marshall Stanmore III Bluetooth speaker with classic rock design", price: 42999 },

    // Tablets
    { name: "iPad Pro M4", description: "Apple iPad Pro 13-inch with M4 chip, Liquid Retina XDR display, 256GB", price: 119900 },
    { name: "iPad Air M2", description: "Apple iPad Air with M2 chip, 11-inch Liquid Retina display, 128GB", price: 69900 },
    { name: "Samsung Galaxy Tab S9 Ultra", description: "Samsung Galaxy Tab S9 Ultra 14.6-inch with Snapdragon 8 Gen 2", price: 108999 },

    // Wearables
    { name: "Apple Watch Ultra 2", description: "Apple Watch Ultra 2 with S9 chip, 49mm Titanium, GPS + Cellular", price: 89900 },
    { name: "Apple Watch Series 9", description: "Apple Watch Series 9 with S9 chip, 45mm Aluminium, GPS", price: 44900 },
    { name: "Samsung Galaxy Watch6 Classic", description: "Samsung Galaxy Watch6 Classic 47mm with rotating bezel", price: 37999 },

    // Gaming
    { name: "PlayStation 5", description: "Sony PlayStation 5 console with DualSense controller, 825GB SSD", price: 49990 },
    { name: "Xbox Series X", description: "Microsoft Xbox Series X 1TB with wireless controller", price: 49990 },
    { name: "Nintendo Switch OLED", description: "Nintendo Switch OLED model with 7-inch OLED screen, White", price: 27499 },
    { name: "Steam Deck OLED", description: "Valve Steam Deck OLED 1TB with HDR display", price: 59900 },

    // Smart Home
    { name: "Apple TV 4K", description: "Apple TV 4K with A15 Bionic chip, 128GB, WiFi + Ethernet", price: 18900 },
    { name: "Google Nest Hub Max", description: "Google Nest Hub Max 10-inch smart display with camera", price: 22999 },
    { name: "Amazon Echo Show 10", description: "Amazon Echo Show 10 with motion tracking, HD display", price: 24999 },

    // Cameras
    { name: "Sony A7 IV", description: "Sony Alpha A7 IV full-frame mirrorless camera body, 33MP", price: 218990 },
    { name: "GoPro Hero 12 Black", description: "GoPro Hero 12 Black action camera with HyperSmooth 6.0", price: 39990 },
  ];

  const products = await Promise.all(
    productData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          imageUrl: null,
        },
      })
    )
  );

  console.log(`Created ${products.length} products`);

  // ─── Create Inventory Records ──────────────────────────

  const inventoryData: {
    productId: string;
    warehouseId: string;
    totalUnits: number;
  }[] = [];

  for (const product of products) {
    // Each product gets stock in 3-6 random warehouses (not all)
    const numWarehouses = Math.floor(Math.random() * 4) + 3; // 3 to 6
    const shuffled = [...warehouses].sort(() => Math.random() - 0.5);
    const selectedWarehouses = shuffled.slice(0, numWarehouses);

    for (const warehouse of selectedWarehouses) {
      // Vary stock levels: some high, some low, some critical
      const rand = Math.random();
      let totalUnits: number;
      if (rand < 0.1) {
        totalUnits = 1; // Critical stock - only 1 left
      } else if (rand < 0.25) {
        totalUnits = Math.floor(Math.random() * 4) + 2; // Low: 2-5
      } else if (rand < 0.6) {
        totalUnits = Math.floor(Math.random() * 15) + 5; // Medium: 5-19
      } else {
        totalUnits = Math.floor(Math.random() * 30) + 15; // High: 15-44
      }

      inventoryData.push({
        productId: product.id,
        warehouseId: warehouse.id,
        totalUnits,
      });
    }
  }

  await prisma.inventory.createMany({
    data: inventoryData.map((item) => ({
      ...item,
      reservedUnits: 0,
    })),
  });

  console.log(`Created ${inventoryData.length} inventory records`);
  console.log("");
  console.log("Seed complete! Here's a summary:");
  console.log("-".repeat(60));

  const allProducts = await prisma.product.findMany({
    include: {
      inventory: {
        include: { warehouse: true },
      },
    },
    orderBy: { name: "asc" },
  });

  for (const product of allProducts) {
    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.totalUnits, 0);
    console.log(`\n${product.name} (Rs.${product.price.toLocaleString()}) - ${totalStock} total units`);
    for (const inv of product.inventory) {
      console.log(`   ${inv.warehouse.name}: ${inv.totalUnits} units`);
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`\nTotal: ${products.length} products, ${warehouses.length} warehouses, ${inventoryData.length} inventory records`);
  console.log("Database is ready!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
