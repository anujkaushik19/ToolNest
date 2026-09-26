import type { BusinessPack, TenantConfig } from "./types";

// ---------------------------------------------------------------------------
// Business Packs — one config object per vertical. This is the whole promise:
// a new business type is a new entry here, not new application code.
// ---------------------------------------------------------------------------

const retail: BusinessPack = {
  id: "retail",
  name: "General / Kirana Store",
  tagline: "Fast billing, stock and daily sales for any retail counter.",
  icon: "Store",
  accent: "from-indigo-500 to-blue-500",
  labels: {
    contact: "Customer", contactPlural: "Customers",
    item: "Product", itemPlural: "Products",
    bill: "Bill", billPlural: "Bills",
  },
  modules: ["billing", "items", "contacts", "reports"],
  itemTypes: ["product"],
  itemFields: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "barcode", label: "Barcode / SKU", type: "text" },
  ],
  contactFields: [{ key: "address", label: "Address", type: "textarea" }],
  taxDefault: 5,
  units: ["pc", "kg", "g", "L", "ml", "pack", "dozen"],
  receipt: { size: "80mm", showGst: true, footer: "Thank you, visit again!" },
  seedItems: [
    { name: "Parle-G Biscuit", itemType: "product", price: 10, taxRate: 5, unit: "pc", trackStock: true, stock: 120 },
    { name: "Tata Salt 1kg", itemType: "product", price: 28, taxRate: 5, unit: "pack", trackStock: true, stock: 60 },
    { name: "Amul Butter 100g", itemType: "product", price: 62, taxRate: 12, unit: "pc", trackStock: true, stock: 40 },
    { name: "Sunflower Oil 1L", itemType: "product", price: 145, taxRate: 5, unit: "L", trackStock: true, stock: 30 },
  ],
};

const clinic: BusinessPack = {
  id: "clinic",
  name: "Doctor's Clinic",
  tagline: "Appointments, consultation billing and prescriptions.",
  icon: "Stethoscope",
  accent: "from-emerald-500 to-teal-500",
  labels: {
    contact: "Patient", contactPlural: "Patients",
    item: "Service", itemPlural: "Services",
    bill: "Invoice", billPlural: "Invoices",
  },
  modules: ["billing", "items", "contacts", "appointments", "reports"],
  itemTypes: ["service"],
  itemFields: [{ key: "duration_min", label: "Duration (min)", type: "number", placeholder: "15" }],
  contactFields: [
    { key: "age", label: "Age", type: "number" },
    { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
    { key: "blood_group", label: "Blood group", type: "select", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    { key: "notes", label: "Medical notes", type: "textarea" },
  ],
  taxDefault: 0,
  units: ["visit"],
  receipt: { size: "a4", showGst: false, footer: "Get well soon." },
  seedItems: [
    { name: "General Consultation", itemType: "service", price: 300, attributes: { duration_min: 15 } },
    { name: "Follow-up Visit", itemType: "service", price: 150, attributes: { duration_min: 10 } },
    { name: "Health Check-up", itemType: "service", price: 900, attributes: { duration_min: 30 } },
  ],
};

const dairy: BusinessPack = {
  id: "dairy",
  name: "Dairy / Milk Shop",
  tagline: "Daily deliveries, subscriptions and monthly billing.",
  icon: "Milk",
  accent: "from-sky-500 to-cyan-500",
  labels: {
    contact: "Subscriber", contactPlural: "Subscribers",
    item: "Product", itemPlural: "Products",
    bill: "Bill", billPlural: "Bills",
  },
  modules: ["billing", "items", "contacts", "subscriptions", "reports"],
  itemTypes: ["product", "subscription"],
  itemFields: [{ key: "fat_pct", label: "Fat %", type: "number", placeholder: "3.5" }],
  contactFields: [
    { key: "address", label: "Delivery address", type: "textarea" },
    { key: "route", label: "Route", type: "text" },
  ],
  taxDefault: 0,
  units: ["L", "ml", "pc", "kg"],
  receipt: { size: "80mm", showGst: false, footer: "Fresh every morning." },
  seedItems: [
    { name: "Full Cream Milk", itemType: "product", price: 33, unit: "L", trackStock: true, stock: 200, attributes: { fat_pct: 6 } },
    { name: "Toned Milk", itemType: "product", price: 27, unit: "L", trackStock: true, stock: 200, attributes: { fat_pct: 3 } },
    { name: "Curd 400g", itemType: "product", price: 30, unit: "pc", trackStock: true, stock: 50 },
    { name: "Paneer 200g", itemType: "product", price: 90, unit: "pc", trackStock: true, stock: 25 },
  ],
};

const restaurant: BusinessPack = {
  id: "restaurant",
  name: "Restaurant / Cafe",
  tagline: "Table billing, KOT-style items and quick checkout.",
  icon: "UtensilsCrossed",
  accent: "from-orange-500 to-rose-500",
  labels: {
    contact: "Guest", contactPlural: "Guests",
    item: "Dish", itemPlural: "Menu",
    bill: "Bill", billPlural: "Bills",
  },
  modules: ["billing", "items", "contacts", "reports"],
  itemTypes: ["product"],
  itemFields: [
    { key: "category", label: "Category", type: "select", options: ["Starter", "Main", "Bread", "Rice", "Dessert", "Beverage"] },
    { key: "veg", label: "Veg / Non-veg", type: "select", options: ["Veg", "Non-veg"] },
  ],
  contactFields: [{ key: "table", label: "Table no.", type: "text" }],
  taxDefault: 5,
  units: ["plate", "pc", "glass", "bowl"],
  receipt: { size: "80mm", showGst: true, footer: "Thanks for dining with us!" },
  seedItems: [
    { name: "Paneer Butter Masala", itemType: "product", price: 240, taxRate: 5, unit: "plate", attributes: { category: "Main", veg: "Veg" } },
    { name: "Butter Naan", itemType: "product", price: 45, taxRate: 5, unit: "pc", attributes: { category: "Bread", veg: "Veg" } },
    { name: "Veg Biryani", itemType: "product", price: 180, taxRate: 5, unit: "plate", attributes: { category: "Rice", veg: "Veg" } },
    { name: "Masala Chai", itemType: "product", price: 25, taxRate: 5, unit: "glass", attributes: { category: "Beverage", veg: "Veg" } },
  ],
};

const salon: BusinessPack = {
  id: "salon",
  name: "Salon / Spa",
  tagline: "Service menu, appointments and quick invoicing.",
  icon: "Scissors",
  accent: "from-fuchsia-500 to-pink-500",
  labels: {
    contact: "Client", contactPlural: "Clients",
    item: "Service", itemPlural: "Services",
    bill: "Invoice", billPlural: "Invoices",
  },
  modules: ["billing", "items", "contacts", "appointments", "reports"],
  itemTypes: ["service", "product"],
  itemFields: [{ key: "duration_min", label: "Duration (min)", type: "number", placeholder: "30" }],
  contactFields: [
    { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
    { key: "preferred_stylist", label: "Preferred stylist", type: "text" },
  ],
  taxDefault: 18,
  units: ["service", "pc"],
  receipt: { size: "80mm", showGst: true, footer: "Looking great — see you soon!" },
  seedItems: [
    { name: "Haircut (Men)", itemType: "service", price: 150, taxRate: 18, attributes: { duration_min: 30 } },
    { name: "Hair Spa", itemType: "service", price: 800, taxRate: 18, attributes: { duration_min: 60 } },
    { name: "Facial — Gold", itemType: "service", price: 1200, taxRate: 18, attributes: { duration_min: 45 } },
    { name: "Beard Trim", itemType: "service", price: 100, taxRate: 18, attributes: { duration_min: 15 } },
  ],
};

const apparel: BusinessPack = {
  id: "apparel",
  name: "Apparel / Saree Shop",
  tagline: "Variants, GST billing and inventory for fashion retail.",
  icon: "Shirt",
  accent: "from-violet-500 to-purple-500",
  labels: {
    contact: "Customer", contactPlural: "Customers",
    item: "Product", itemPlural: "Catalogue",
    bill: "Invoice", billPlural: "Invoices",
  },
  modules: ["billing", "items", "contacts", "reports"],
  itemTypes: ["product"],
  itemFields: [
    { key: "fabric", label: "Fabric", type: "select", options: ["Cotton", "Silk", "Georgette", "Chiffon", "Linen", "Banarasi"] },
    { key: "colour", label: "Colour", type: "text" },
    { key: "occasion", label: "Occasion", type: "select", options: ["Casual", "Party", "Wedding", "Festive", "Office"] },
  ],
  contactFields: [{ key: "address", label: "Address", type: "textarea" }],
  taxDefault: 12,
  units: ["pc", "set", "m"],
  receipt: { size: "a4", showGst: true, footer: "Thank you for shopping with us!" },
  seedItems: [
    { name: "Banarasi Silk Saree", itemType: "product", price: 4500, taxRate: 12, unit: "pc", trackStock: true, stock: 12, attributes: { fabric: "Banarasi", occasion: "Wedding", colour: "Maroon" } },
    { name: "Cotton Kurti", itemType: "product", price: 799, taxRate: 12, unit: "pc", trackStock: true, stock: 35, attributes: { fabric: "Cotton", occasion: "Casual", colour: "Teal" } },
    { name: "Georgette Anarkali", itemType: "product", price: 2200, taxRate: 12, unit: "pc", trackStock: true, stock: 18, attributes: { fabric: "Georgette", occasion: "Party", colour: "Navy" } },
  ],
};

export const PACKS: BusinessPack[] = [retail, clinic, dairy, restaurant, salon, apparel];

export function getPack(id: string): BusinessPack | undefined {
  return PACKS.find((p) => p.id === id);
}

/** Copy a pack's defaults into a per-tenant config (so edits never mutate the pack). */
export function configFromPack(pack: BusinessPack): TenantConfig {
  return {
    labels: { ...pack.labels },
    modules: [...pack.modules],
    itemTypes: [...pack.itemTypes],
    itemFields: pack.itemFields.map((f) => ({ ...f })),
    contactFields: pack.contactFields.map((f) => ({ ...f })),
    taxDefault: pack.taxDefault,
    units: [...pack.units],
    receipt: { ...pack.receipt },
    accent: pack.accent,
    icon: pack.icon,
  };
}
