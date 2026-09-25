export type Kind =
  | "food" | "grocery" | "service" | "medical" | "bakery" | "flowers"
  | "electronics" | "hardware" | "pets" | "sweets"
  | "fashion" | "beauty" | "homekitchen" | "furniture" | "books"
  | "toys" | "sports" | "auto" | "mobile" | "household";

export interface Store {
  id: string;
  name: string;
  slug: string;
  kind: Kind;
  tagline: string;
  emoji: string;
  image: string;
  tint: string;
  rating: number;
  ratingsCount: string;
  etaMins: number;
  deliveryFee: number;
  distanceKm: number;
  address: string;
  isOpen: boolean;
  isPureVeg?: boolean;
  offers: string[];
  tags: string[];
  openHours: string;
  healthScore: number;
  cuisine?: string;
  priceForTwo?: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  mrp?: number;
  emoji: string;
  image: string;
  images?: string[];
  category: string;
  rating: number;
  isVeg: boolean;
  isBestseller?: boolean;
  stock: number;
  unit: string;
  tint: string;
  eta?: string;
  hidden?: boolean;
}

const IMG = {
  biryani1: "https://images.pexels.com/photos/9609862/pexels-photo-9609862.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  biryani2: "https://images.pexels.com/photos/7340936/pexels-photo-7340936.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  biryani3: "https://images.pexels.com/photos/9609840/pexels-photo-9609840.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  burger1: "https://images.pexels.com/photos/551991/pexels-photo-551991.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  burger2: "https://images.pexels.com/photos/9268664/pexels-photo-9268664.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  dosa1: "https://images.pexels.com/photos/12392915/pexels-photo-12392915.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  dosa2: "https://images.pexels.com/photos/20422138/pexels-photo-20422138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  thali: "https://images.pexels.com/photos/14132112/pexels-photo-14132112.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  vegMarket: "https://images.pexels.com/photos/9705821/pexels-photo-9705821.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  vegStall: "https://images.pexels.com/photos/26309839/pexels-photo-26309839.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  tomato: "https://images.pexels.com/photos/34508193/pexels-photo-34508193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  spinach: "https://images.pexels.com/photos/4506881/pexels-photo-4506881.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mango: "https://images.pexels.com/photos/5097708/pexels-photo-5097708.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  milk: "https://images.pexels.com/photos/11337258/pexels-photo-11337258.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  milk2: "https://images.pexels.com/photos/3038/morning-breakfast-kitchen-cutting-board.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  bread: "https://images.pexels.com/photos/28354523/pexels-photo-28354523.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  pasta: "https://images.pexels.com/photos/11220209/pexels-photo-11220209.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  coffee: "https://images.pexels.com/photos/23708982/pexels-photo-23708982.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  chilliChicken: "https://images.pexels.com/photos/28674534/pexels-photo-28674534.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  prawn: "https://images.pexels.com/photos/9609841/pexels-photo-9609841.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  cake: "https://images.pexels.com/photos/39212272/pexels-photo-39212272.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  cakeSlice: "https://images.pexels.com/photos/10153294/pexels-photo-10153294.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  roses: "https://images.pexels.com/photos/13306125/pexels-photo-13306125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  plumber: "https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  tapTool: "https://images.pexels.com/photos/8488058/pexels-photo-8488058.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  electric: "https://images.pexels.com/photos/27928761/pexels-photo-27928761.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  facial: "https://images.pexels.com/photos/5659018/pexels-photo-5659018.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  facial2: "https://images.pexels.com/photos/7446689/pexels-photo-7446689.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  clean: "https://images.pexels.com/photos/6195951/pexels-photo-6195951.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  clean2: "https://images.pexels.com/photos/6195952/pexels-photo-6195952.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  meds: "https://images.pexels.com/photos/5452239/pexels-photo-5452239.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  meds2: "https://images.pexels.com/photos/7956965/pexels-photo-7956965.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  oil: "https://images.pexels.com/photos/4910159/pexels-photo-4910159.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  rice: "https://images.pexels.com/photos/7421207/pexels-photo-7421207.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  meals: "https://images.pexels.com/photos/35539324/pexels-photo-35539324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mithai: "https://images.pexels.com/photos/19151506/pexels-photo-19151506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mithai2: "https://images.pexels.com/photos/11484120/pexels-photo-11484120.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  tools: "https://images.pexels.com/photos/6024540/pexels-photo-6024540.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  tools2: "https://images.pexels.com/photos/11398216/pexels-photo-11398216.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  gadgets: "https://images.pexels.com/photos/10433458/pexels-photo-10433458.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  gadgets2: "https://images.pexels.com/photos/11945638/pexels-photo-11945638.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  petfood: "https://images.pexels.com/photos/8434633/pexels-photo-8434633.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  petfood2: "https://images.pexels.com/photos/34952073/pexels-photo-34952073.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  icecream: "https://images.pexels.com/photos/684968/pexels-photo-684968.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  icecream2: "https://images.pexels.com/photos/5796721/pexels-photo-5796721.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  fashion: "https://images.pexels.com/photos/1488470/pexels-photo-1488470.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  fashion2: "https://images.pexels.com/photos/9207813/pexels-photo-9207813.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  beauty: "https://images.pexels.com/photos/3552894/pexels-photo-3552894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  beauty2: "https://images.pexels.com/photos/7512743/pexels-photo-7512743.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  furniture: "https://images.pexels.com/photos/39276077/pexels-photo-39276077.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  furniture2: "https://images.pexels.com/photos/6969830/pexels-photo-6969830.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  books: "https://images.pexels.com/photos/273034/pexels-photo-273034.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  books2: "https://images.pexels.com/photos/3981761/pexels-photo-3981761.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  toys: "https://images.pexels.com/photos/35115535/pexels-photo-35115535.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  toys2: "https://images.pexels.com/photos/36625295/pexels-photo-36625295.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  sports: "https://images.pexels.com/photos/35567437/pexels-photo-35567437.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  sports2: "https://images.pexels.com/photos/3999606/pexels-photo-3999606.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  auto: "https://images.pexels.com/photos/35641871/pexels-photo-35641871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mobile: "https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  mobile2: "https://images.pexels.com/photos/36012993/pexels-photo-36012993.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  kitchen: "https://images.pexels.com/photos/37421331/pexels-photo-37421331.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  cleaning: "https://images.pexels.com/photos/5217889/pexels-photo-5217889.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  baby: "https://images.pexels.com/photos/32950999/pexels-photo-32950999.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};

export interface CategoryDef { k: string; t: string; sub: string; img: string; kinds: Kind[]; accent: string; eta: string; subs: string[]; emoji: string; featured?: boolean; hidden?: boolean; dynamic?: boolean; }

export interface CategoryDef { k: string; t: string; sub: string; img: string; kinds: Kind[]; accent: string; eta: string; }

export const CATEGORIES: CategoryDef[] = [
  { k: "food", t: "Food", sub: "Restaurants & cafes", img: IMG.biryani1, kinds: ["food"], accent: "#E23744", eta: "25 min", emoji: "🍛", featured: true, subs: ["Biryani", "North Indian", "South Indian", "Chinese", "Burgers", "Desserts"] },
  { k: "grocery", t: "Grocery", sub: "Daily needs in minutes", img: IMG.vegMarket, kinds: ["grocery"], accent: "#0C831F", eta: "12 min", emoji: "🥬", featured: true, subs: ["Vegetables & Fruits", "Dairy & Eggs", "Staples & Atta", "Snacks", "Beverages", "Snacks & Munchies"] },
  { k: "medical", t: "Pharmacy", sub: "Medicines, 24×7", img: IMG.meds, kinds: ["medical"], accent: "#1573FF", eta: "15 min", emoji: "💊", featured: true, subs: ["Medicines", "Wellness", "Health devices", "Surgical", "Baby care"] },
  { k: "bakery", t: "Bakery & Cakes", sub: "Fresh bakes daily", img: IMG.cakeSlice, kinds: ["bakery"], accent: "#C2185B", eta: "30 min", emoji: "🎂", subs: ["Cakes", "Breads", "Cookies", "Ice cream", "Pastries"] },
  { k: "sweets", t: "Sweets & Gifts", sub: "Mithai & gift boxes", img: IMG.mithai, kinds: ["sweets"], accent: "#E8830C", eta: "28 min", emoji: "🍬", subs: ["Mithai", "Gift packs", "Dry fruits", "Chocolates"] },
  { k: "flowers", t: "Flowers", sub: "Same-day bouquets", img: IMG.roses, kinds: ["flowers"], accent: "#D81B60", eta: "25 min", emoji: "💐", subs: ["Bouquets", "Roses", "Décor", "Greeting cards"] },
  { k: "fashion", t: "Fashion", sub: "Men, women & kids", img: IMG.fashion, kinds: ["fashion"], accent: "#AD1457", eta: "2 days", emoji: "👕", featured: true, subs: ["Men", "Women", "Kids", "Footwear", "Ethnic", "Accessories"] },
  { k: "beauty", t: "Beauty & Care", sub: "Cosmetics & grooming", img: IMG.beauty, kinds: ["beauty"], accent: "#D81B60", eta: "35 min", emoji: "💄", subs: ["Skincare", "Makeup", "Haircare", "Grooming", "Fragrances"] },
  { k: "electronics", t: "Electronics", sub: "Gadgets & appliances", img: IMG.gadgets, kinds: ["electronics"], accent: "#00838F", eta: "40 min", emoji: "🎧", subs: ["Audio", "Wearables", "Appliances", "Cameras", "Storage"] },
  { k: "mobile", t: "Mobile & Computer", sub: "Accessories & chargers", img: IMG.mobile, kinds: ["mobile", "electronics"], accent: "#283593", eta: "35 min", emoji: "🔌", featured: true, subs: ["Chargers", "Cables", "Cases & covers", "Laptop accessories", "Power banks"] },
  { k: "homekitchen", t: "Home & Kitchen", sub: "Cookware & storage", img: IMG.kitchen, kinds: ["homekitchen"], accent: "#5D4037", eta: "1 day", emoji: "🍳", subs: ["Cookware", "Storage", "Kitchen tools", "Decor", "Appliances"] },
  { k: "furniture", t: "Furniture", sub: "Home & office", img: IMG.furniture, kinds: ["furniture"], accent: "#6D4C41", eta: "2 days", emoji: "🪑", subs: ["Chairs", "Tables", "Beds", "Office", "Storage"] },
  { k: "hardware", t: "Hardware & Electrical", sub: "Tools, paint & parts", img: IMG.tools, kinds: ["hardware"], accent: "#455A64", eta: "35 min", emoji: "🔩", subs: ["Power tools", "Paints", "Electrical", "Plumbing", "Fittings"] },
  { k: "books", t: "Books & Stationery", sub: "Books, art & office", img: IMG.books, kinds: ["books"], accent: "#1565C0", eta: "1 day", emoji: "📚", subs: ["Books", "Notebooks", "Art supplies", "Office", "School"] },
  { k: "toys", t: "Toys, Baby & Kids", sub: "Toys, diapers & more", img: IMG.toys, kinds: ["toys"], accent: "#EF6C00", eta: "1 day", emoji: "🧸", featured: true, subs: ["Toys & games", "Diapers", "Feeding", "Baby care", "School"] },
  { k: "pets", t: "Pet Supplies", sub: "Food, toys & grooming", img: IMG.petfood, kinds: ["pets"], accent: "#F57C00", eta: "20 min", emoji: "🐾", subs: ["Dog food", "Cat food", "Toys", "Grooming", "Accessories"] },
  { k: "sports", t: "Sports & Fitness", sub: "Gear & equipment", img: IMG.sports, kinds: ["sports"], accent: "#2E7D32", eta: "1 day", emoji: "🏋️", subs: ["Fitness", "Cricket", "Cycling", "Yoga", "Outdoor"] },
  { k: "auto", t: "Automobile", sub: "Car & bike accessories", img: IMG.auto, kinds: ["auto"], accent: "#37474F", eta: "1 day", emoji: "🚗", subs: ["Car accessories", "Bike accessories", "Cleaning", "Safety", "Tools"] },
  { k: "household", t: "Household & Cleaning", sub: "Detergents & essentials", img: IMG.cleaning, kinds: ["household", "grocery"], accent: "#00897B", eta: "18 min", emoji: "🧺", subs: ["Detergents", "Fresheners", "Tissue & disposables", "Cleaning tools"] },
  { k: "service", t: "Home Services", sub: "Verified pros at home", img: IMG.facial, kinds: ["service"], accent: "#7C5CFF", eta: "45 min", emoji: "🛠️", featured: true, subs: ["Plumbing", "Electrical", "Salon at home", "Cleaning", "Appliance repair"] },
];

export const STORES: Store[] = [
  { id: "s1", name: "Meghana Foods", slug: "meghana", kind: "food", tagline: "Andhra legends • Since 2006", emoji: "🍛", image: IMG.biryani1, tint: "#FFE7C2", rating: 4.6, ratingsCount: "12.4k", etaMins: 28, deliveryFee: 29, distanceKm: 1.1, address: "HSR Layout Sec 2", isOpen: true, offers: ["50% OFF up to ₹100", "Free delivery over ₹199"], tags: ["Biryani", "Andhra", "Meals"], openHours: "11 AM – 11 PM", healthScore: 94, cuisine: "Biryani • Andhra • North Indian", priceForTwo: "₹600" },
  { id: "s2", name: "Truffles & Co.", slug: "truffles", kind: "food", tagline: "Burgers, pastas & shakes", emoji: "🍔", image: IMG.burger1, tint: "#E4E7FF", rating: 4.5, ratingsCount: "8.2k", etaMins: 22, deliveryFee: 19, distanceKm: 0.8, address: "27th Main, HSR", isOpen: true, offers: ["Flat ₹125 OFF"], tags: ["Burgers", "Continental"], openHours: "11 AM – 11:30 PM", healthScore: 91, cuisine: "Burger • Pasta • Beverages", priceForTwo: "₹800" },
  { id: "s3", name: "Udupi Sagar", slug: "udupi", kind: "food", tagline: "Pure veg • Crisp dosas", emoji: "🥞", image: IMG.dosa1, tint: "#D8F3DC", rating: 4.4, ratingsCount: "5.1k", etaMins: 18, deliveryFee: 0, distanceKm: 0.6, address: "5th Cross HSR", isOpen: true, isPureVeg: true, offers: ["Free delivery"], tags: ["South Indian", "Pure Veg"], openHours: "7 AM – 10 PM", healthScore: 89, cuisine: "South Indian • Udupi", priceForTwo: "₹300" },
  { id: "s4", name: "Behrouz Cloud", slug: "behrouz", kind: "food", tagline: "Royal dum biryanis", emoji: "🍲", image: IMG.biryani2, tint: "#FFE0D6", rating: 4.3, ratingsCount: "3.8k", etaMins: 32, deliveryFee: 35, distanceKm: 2.4, address: "Koramangala", isOpen: true, offers: ["20% OFF + free gulab"], tags: ["Biryani", "Mughlai"], openHours: "10 AM – 11 PM", healthScore: 87, cuisine: "Biryani • Mughlai • Kebab", priceForTwo: "₹700" },
  { id: "s5", name: "FreshKart Daily", slug: "freshkart", kind: "grocery", tagline: "Farm veggies in 18 mins", emoji: "🥬", image: IMG.vegMarket, tint: "#DFF5D1", rating: 4.7, ratingsCount: "21k", etaMins: 18, deliveryFee: 15, distanceKm: 0.9, address: "HSR Fresh Hub", isOpen: true, isPureVeg: true, offers: ["20% OFF fresh veg", "₹50 cashback"], tags: ["Vegetables", "Fruits", "Dairy"], openHours: "6 AM – 11 PM", healthScore: 96, cuisine: "Vegetables • Fruits • Dairy", priceForTwo: "—" },
  { id: "s6", name: "Milk & More", slug: "milk", kind: "grocery", tagline: "Milk, bread, eggs daily", emoji: "🥛", image: IMG.milk, tint: "#E8F4FF", rating: 4.6, ratingsCount: "9.4k", etaMins: 12, deliveryFee: 0, distanceKm: 0.5, address: "Sector 1 Market", isOpen: true, offers: ["Free delivery", "Subscribe & save 10%"], tags: ["Dairy", "Bakery"], openHours: "5 AM – 10 PM", healthScore: 93, cuisine: "Dairy • Bakery • Eggs", priceForTwo: "—" },
  { id: "s7", name: "Spice Route Mart", slug: "spice", kind: "grocery", tagline: "Atta, oils & masalas", emoji: "🫙", image: IMG.vegStall, tint: "#FFF0C8", rating: 4.5, ratingsCount: "6.7k", etaMins: 24, deliveryFee: 25, distanceKm: 1.6, address: "Agara Road", isOpen: true, offers: ["Up to 35% OFF staples"], tags: ["Staples", "Masala"], openHours: "8 AM – 10 PM", healthScore: 90, cuisine: "Staples • Atta • Oils", priceForTwo: "—" },
  { id: "s8", name: "Bloom & Bake", slug: "bloom", kind: "grocery", tagline: "Cakes, flowers & gifts", emoji: "🌸", image: IMG.cake, tint: "#FFE3EE", rating: 4.8, ratingsCount: "4.2k", etaMins: 30, deliveryFee: 39, distanceKm: 1.3, address: "27th Main Floral St", isOpen: true, offers: ["Free message card"], tags: ["Bakery", "Flowers"], openHours: "9 AM – 9 PM", healthScore: 92, cuisine: "Bakery • Flowers • Gifts", priceForTwo: "—" },
  { id: "s9", name: "FixIt Home Pros", slug: "fixit", kind: "service", tagline: "Plumber • Electrician • 4.9★", emoji: "🛠️", image: IMG.plumber, tint: "#E6E4FF", rating: 4.9, ratingsCount: "11k", etaMins: 45, deliveryFee: 49, distanceKm: 1.0, address: "HSR Service Bay", isOpen: true, offers: ["₹99 visit waived"], tags: ["Plumbing", "Electrical"], openHours: "8 AM – 9 PM", healthScore: 97, cuisine: "Plumbing • Electrical", priceForTwo: "—" },
  { id: "s10", name: "Glow Salon At-Home", slug: "glow", kind: "service", tagline: "Salon for women & men", emoji: "💅", image: IMG.facial, tint: "#FFE7F5", rating: 4.8, ratingsCount: "7.9k", etaMins: 60, deliveryFee: 0, distanceKm: 1.8, address: "Home visits", isOpen: true, offers: ["Flat 25% OFF facials"], tags: ["Salon", "Spa"], openHours: "9 AM – 8 PM", healthScore: 95, cuisine: "Salon • Spa • Grooming", priceForTwo: "—" },
  { id: "s11", name: "Sparkle Clean Co.", slug: "sparkle", kind: "service", tagline: "Deep home cleaning", emoji: "🧹", image: IMG.clean, tint: "#DFF7F3", rating: 4.7, ratingsCount: "5.6k", etaMins: 90, deliveryFee: 0, distanceKm: 2.1, address: "Citywide", isOpen: true, offers: ["Kitchen deep clean ₹999"], tags: ["Cleaning"], openHours: "8 AM – 8 PM", healthScore: 90, cuisine: "Home Cleaning • Kitchen", priceForTwo: "—" },
  { id: "s12", name: "MediCare Plus", slug: "medicare", kind: "medical", tagline: "Medicines 24×7 • 15 min", emoji: "💊", image: IMG.meds, tint: "#E3F2FF", rating: 4.6, ratingsCount: "13k", etaMins: 15, deliveryFee: 20, distanceKm: 0.7, address: "Apollo Junction", isOpen: true, offers: ["20% OFF meds"], tags: ["Pharmacy", "24x7"], openHours: "Open 24 hrs", healthScore: 94, cuisine: "Pharmacy • Healthcare", priceForTwo: "—" },
  { id: "s13", name: "Anand Sweets", slug: "anand", kind: "sweets", tagline: "Mithai, laddoo & dry fruits", emoji: "🍬", image: IMG.mithai, tint: "#FFE9C7", rating: 4.8, ratingsCount: "16k", etaMins: 28, deliveryFee: 25, distanceKm: 1.4, address: "100ft Road HSR", isOpen: true, isPureVeg: true, offers: ["Diwali box 15% OFF"], tags: ["Sweets", "Gifts"], openHours: "8 AM – 10 PM", healthScore: 95, cuisine: "Mithai • Namkeen • Gift boxes", priceForTwo: "—" },
  { id: "s14", name: "Scoops & Slices", slug: "scoops", kind: "bakery", tagline: "Ice cream & desserts 24×7", emoji: "🍨", image: IMG.icecream, tint: "#FFE3F0", rating: 4.7, ratingsCount: "8.8k", etaMins: 20, deliveryFee: 19, distanceKm: 1.0, address: "27th Main HSR", isOpen: true, isPureVeg: true, offers: ["Buy 1 Get 1 tubs"], tags: ["Ice Cream", "Desserts"], openHours: "Open 24 hrs", healthScore: 92, cuisine: "Ice Cream • Cakes • Shakes", priceForTwo: "₹300" },
  { id: "s15", name: "Volt Electronics", slug: "volt", kind: "electronics", tagline: "Gadgets, cables & repair", emoji: "🎧", image: IMG.gadgets, tint: "#E0F7FA", rating: 4.5, ratingsCount: "3.4k", etaMins: 40, deliveryFee: 39, distanceKm: 2.2, address: "Sector 3 Market", isOpen: true, offers: ["₹300 OFF above ₹1999"], tags: ["Electronics", "Repair"], openHours: "10 AM – 9 PM", healthScore: 88, cuisine: "Audio • Mobile • Accessories", priceForTwo: "—" },
  { id: "s16", name: "Sharma Hardware", slug: "sharma", kind: "hardware", tagline: "Tools, paint & plumbing parts", emoji: "🔩", image: IMG.tools, tint: "#EFEBE9", rating: 4.4, ratingsCount: "2.1k", etaMins: 35, deliveryFee: 35, distanceKm: 1.9, address: "Agara Main Road", isOpen: true, offers: ["Free delivery above ₹999"], tags: ["Hardware", "Paint"], openHours: "9 AM – 8 PM", healthScore: 86, cuisine: "Tools • Paint • Fittings", priceForTwo: "—" },
  { id: "s17", name: "Pawfect Store", slug: "pawfect", kind: "pets", tagline: "Pet food, toys & grooming", emoji: "🐾", image: IMG.petfood, tint: "#FFF3E0", rating: 4.8, ratingsCount: "5.2k", etaMins: 20, deliveryFee: 0, distanceKm: 1.2, address: "HSR Sec 6", isOpen: true, offers: ["Free treats with orders"], tags: ["Pets", "Grooming"], openHours: "9 AM – 9 PM", healthScore: 93, cuisine: "Dog • Cat • Accessories", priceForTwo: "—" },
  { id: "s18", name: "Petals & Co.", slug: "petals", kind: "flowers", tagline: "Same-day bouquets & décor", emoji: "💐", image: IMG.roses, tint: "#FFE3EE", rating: 4.9, ratingsCount: "6.4k", etaMins: 25, deliveryFee: 29, distanceKm: 1.1, address: "Floral Street", isOpen: true, isPureVeg: true, offers: ["Free greeting card"], tags: ["Flowers", "Gifts"], openHours: "7 AM – 9 PM", healthScore: 96, cuisine: "Roses • Lilies • Décor", priceForTwo: "—" },
  { id: "s19", name: "Style Bazaar", slug: "stylebazaar", kind: "fashion", tagline: "Trends from local boutiques", emoji: "👕", image: IMG.fashion, tint: "#FCE4EC", rating: 4.6, ratingsCount: "4.9k", etaMins: 1440, deliveryFee: 0, distanceKm: 2.6, address: "Commercial Street", isOpen: true, offers: ["40-70% end of season"], tags: ["Men", "Women", "Ethnic"], openHours: "10 AM – 9 PM", healthScore: 90, cuisine: "Fashion • Footwear • Ethnic", priceForTwo: "—" },
  { id: "s20", name: "Glow & Grace Beauty", slug: "glowgrace", kind: "beauty", tagline: "Skincare, makeup & grooming", emoji: "💄", image: IMG.beauty, tint: "#F8BBD0", rating: 4.7, ratingsCount: "3.3k", etaMins: 35, deliveryFee: 25, distanceKm: 1.7, address: "HSR 14th Cross", isOpen: true, offers: ["Min 30% OFF skincare"], tags: ["Skincare", "Makeup"], openHours: "10 AM – 9 PM", healthScore: 92, cuisine: "Skincare • Makeup • Grooming", priceForTwo: "—" },
  { id: "s21", name: "Urban Living Furniture", slug: "urbanliving", kind: "furniture", tagline: "Rent-ready & solid wood", emoji: "🪑", image: IMG.furniture, tint: "#D7CCC8", rating: 4.5, ratingsCount: "1.8k", etaMins: 2880, deliveryFee: 0, distanceKm: 3.4, address: "Hosur Road", isOpen: true, offers: ["Free assembly"], tags: ["Chairs", "Tables", "Beds"], openHours: "10 AM – 8 PM", healthScore: 88, cuisine: "Chairs • Beds • Office", priceForTwo: "—" },
  { id: "s22", name: "Bookworm Stationers", slug: "bookworm", kind: "books", tagline: "Books, art & office supplies", emoji: "📚", image: IMG.books, tint: "#BBDEFB", rating: 4.8, ratingsCount: "2.6k", etaMins: 1440, deliveryFee: 20, distanceKm: 1.5, address: "5th Block HSR", isOpen: true, offers: ["Flat 20% stationery"], tags: ["Books", "Stationery", "Art"], openHours: "9 AM – 9 PM", healthScore: 93, cuisine: "Books • Notebooks • Art", priceForTwo: "—" },
  { id: "s23", name: "Kiddo World", slug: "kiddo", kind: "toys", tagline: "Toys, baby care & games", emoji: "🧸", image: IMG.toys, tint: "#FFE0B2", rating: 4.7, ratingsCount: "3.1k", etaMins: 1440, deliveryFee: 25, distanceKm: 2.0, address: "Sector 2 Market", isOpen: true, offers: ["Baby care combo ₹999"], tags: ["Toys", "Diapers", "Baby"], openHours: "10 AM – 9 PM", healthScore: 91, cuisine: "Toys • Baby care • Games", priceForTwo: "—" },
  { id: "s24", name: "FitPro Sports", slug: "fitpro", kind: "sports", tagline: "Home gym & sports gear", emoji: "🏋️", image: IMG.sports, tint: "#C8E6C9", rating: 4.6, ratingsCount: "2.2k", etaMins: 1440, deliveryFee: 0, distanceKm: 2.8, address: "Agara Sports Hub", isOpen: true, offers: ["Up to 50% gym gear"], tags: ["Fitness", "Cricket", "Yoga"], openHours: "9 AM – 9 PM", healthScore: 89, cuisine: "Fitness • Cricket • Cycling", priceForTwo: "—" },
  { id: "s25", name: "AutoKart Accessories", slug: "autokart", kind: "auto", tagline: "Car & bike must-haves", emoji: "🚗", image: IMG.auto, tint: "#CFD8DC", rating: 4.4, ratingsCount: "1.5k", etaMins: 1440, deliveryFee: 30, distanceKm: 3.0, address: "Silk Board", isOpen: true, offers: ["Monsoon kit ₹499"], tags: ["Car", "Bike", "Cleaning"], openHours: "9 AM – 8 PM", healthScore: 86, cuisine: "Car • Bike • Safety", priceForTwo: "—" },
  { id: "s26", name: "GizmoHub", slug: "gizmohub", kind: "mobile", tagline: "Chargers, cases & cables", emoji: "🔌", image: IMG.mobile, tint: "#C5CAE9", rating: 4.5, ratingsCount: "4.4k", etaMins: 35, deliveryFee: 19, distanceKm: 1.2, address: "27th Main HSR", isOpen: true, offers: ["Cables at ₹99"], tags: ["Chargers", "Cases", "Cables"], openHours: "10 AM – 10 PM", healthScore: 90, cuisine: "Mobile • Computer accessories", priceForTwo: "—" },
  { id: "s27", name: "Kitchen Kraft", slug: "kitchenkraft", kind: "homekitchen", tagline: "Cookware & smart kitchen", emoji: "🍳", image: IMG.kitchen, tint: "#D7CCC8", rating: 4.6, ratingsCount: "2.0k", etaMins: 1440, deliveryFee: 0, distanceKm: 2.3, address: "Central Market", isOpen: true, offers: ["Cookware sets 40% OFF"], tags: ["Cookware", "Storage", "Tools"], openHours: "10 AM – 9 PM", healthScore: 89, cuisine: "Cookware • Storage • Decor", priceForTwo: "—" },
  { id: "s28", name: "DailyNeeds Mart", slug: "dailyneeds", kind: "household", tagline: "Detergents & cleaning essentials", emoji: "🧺", image: IMG.cleaning, tint: "#B2DFDB", rating: 4.5, ratingsCount: "5.8k", etaMins: 18, deliveryFee: 15, distanceKm: 0.8, address: "HSR Sector 1", isOpen: true, offers: ["₹100 OFF above ₹699"], tags: ["Detergents", "Cleaning", "Fresheners"], openHours: "7 AM – 10 PM", healthScore: 92, cuisine: "Detergents • Cleaning • Household", priceForTwo: "—" },
];

export const PRODUCTS: Product[] = [
  { id: "p1", storeId: "s1", name: "Chicken Dum Biryani", description: "Seeraga samba rice, mirchi ka salan, raita. Serves 1-2.", price: 249, mrp: 329, emoji: "🍛", image: IMG.biryani1, category: "Biryani", rating: 4.7, isVeg: false, isBestseller: true, stock: 22, unit: "Serves 1", tint: "#FFE7C2", eta: "25 mins" },
  { id: "p2", storeId: "s1", name: "Boneless Chilli Chicken", description: "Fiery Andhra toss, curry leaves, lemon.", price: 229, mrp: 279, emoji: "🍗", image: IMG.chilliChicken, category: "Starters", rating: 4.5, isVeg: false, stock: 18, unit: "350 g", tint: "#FFE0D6", eta: "20 mins" },
  { id: "p3", storeId: "s1", name: "Prawn Ghee Roast", description: "Coastal masala, ghee roast, steamed rice.", price: 329, mrp: 399, emoji: "🍤", image: IMG.prawn, category: "Seafood", rating: 4.6, isVeg: false, isBestseller: true, stock: 9, unit: "Serves 1", tint: "#FFD9CE", eta: "30 mins" },
  { id: "p4", storeId: "s2", name: "Truffle Paneer Burger + Fries", description: "Crisp paneer, mint slaw, brioche bun + fries.", price: 179, mrp: 229, emoji: "🍔", image: IMG.burger2, category: "Burgers", rating: 4.4, isVeg: true, isBestseller: true, stock: 30, unit: "1 pc", tint: "#E4E7FF", eta: "18 mins" },
  { id: "p5", storeId: "s2", name: "Alfredo Pasta Bowl", description: "Silky parmesan cream, exotic veggies.", price: 219, mrp: 259, emoji: "🍝", image: IMG.pasta, category: "Pasta", rating: 4.3, isVeg: true, stock: 14, unit: "350 g", tint: "#FFF0C8", eta: "22 mins" },
  { id: "p6", storeId: "s3", name: "Mysore Masala Dosa", description: "Red garlic chutney, potato palya, filter coffee combo.", price: 129, mrp: 149, emoji: "🥞", image: IMG.dosa1, category: "Dosa", rating: 4.6, isVeg: true, isBestseller: true, stock: 40, unit: "1 pc", tint: "#D8F3DC", eta: "15 mins" },
  { id: "p7", storeId: "s3", name: "Bisibele Bath + Khara Bath", description: "Karnataka classic, ghee, boondi.", price: 99, mrp: 129, emoji: "🍚", image: IMG.meals, category: "Meals", rating: 4.5, isVeg: true, stock: 26, unit: "400 g", tint: "#E8F4D8", eta: "15 mins" },
  { id: "p8", storeId: "s5", name: "Farm Tomato Desi (1kg)", description: "Vine-ripened, farm direct this morning.", price: 42, mrp: 60, emoji: "🍅", image: IMG.tomato, category: "Vegetables", rating: 4.6, isVeg: true, stock: 120, unit: "1 kg", tint: "#FFDDD6", eta: "12 mins" },
  { id: "p9", storeId: "s5", name: "Spinach + Coriander Bunch", description: "Hydro-cooled greens, no pesticides.", price: 35, mrp: 50, emoji: "🥬", image: IMG.spinach, category: "Vegetables", rating: 4.7, isVeg: true, isBestseller: true, stock: 80, unit: "2 bunches", tint: "#DFF5D1", eta: "10 mins" },
  { id: "p10", storeId: "s5", name: "Alphonso Mangoes (2pc)", description: "Ratnagiri GI tag, naturally ripened.", price: 189, mrp: 240, emoji: "🥭", image: IMG.mango, category: "Fruits", rating: 4.8, isVeg: true, stock: 16, unit: "2 pcs", tint: "#FFF0B8", eta: "14 mins" },
  { id: "p11", storeId: "s6", name: "A2 Desi Cow Milk", description: "Single-origin, 6AM milking, glass bottle.", price: 78, mrp: 90, emoji: "🥛", image: IMG.milk2, category: "Dairy", rating: 4.9, isVeg: true, isBestseller: true, stock: 60, unit: "1 L", tint: "#E8F4FF", eta: "8 mins" },
  { id: "p12", storeId: "s6", name: "Sourdough Loaf", description: "48-hr ferment, stone-baked today.", price: 145, mrp: 170, emoji: "🍞", image: IMG.bread, category: "Bakery", rating: 4.6, isVeg: true, stock: 12, unit: "400 g", tint: "#F3E6D2", eta: "18 mins" },
  { id: "p13", storeId: "s7", name: "Cold-Pressed Groundnut Oil 1L", description: "Wood-pressed, single filter.", price: 245, mrp: 310, emoji: "🫗", image: IMG.oil, category: "Staples", rating: 4.5, isVeg: true, stock: 34, unit: "1 L", tint: "#FFF0C8", eta: "20 mins" },
  { id: "p14", storeId: "s7", name: "Basmati Long Grain 5kg", description: "Aged 2 years, extra-long.", price: 649, mrp: 820, emoji: "🍚", image: IMG.rice, category: "Staples", rating: 4.4, isVeg: true, stock: 20, unit: "5 kg", tint: "#FFF8E0", eta: "22 mins" },
  { id: "p15", storeId: "s8", name: "Belgian Truffle Cake 550g", description: "Midnight delivery available.", price: 549, mrp: 699, emoji: "🍰", image: IMG.cakeSlice, category: "Bakery", rating: 4.8, isVeg: true, isBestseller: true, stock: 8, unit: "550 g", tint: "#FFE3EE", eta: "30 mins" },
  { id: "p16", storeId: "s8", name: "Red Rose Bouquet 12 stems", description: "Fresh roses, wrapped + card.", price: 399, mrp: 499, emoji: "🌹", image: IMG.roses, category: "Flowers", rating: 4.9, isVeg: true, stock: 15, unit: "12 stems", tint: "#FFD6E6", eta: "25 mins" },
  { id: "p17", storeId: "s9", name: "Tap & Mixer Repair Visit", description: "Visit + up to 30 min labour. Spares extra.", price: 199, emoji: "🔧", image: IMG.tapTool, category: "Plumbing", rating: 4.9, isVeg: true, stock: 99, unit: "Visit", tint: "#E6E4FF", eta: "45 mins" },
  { id: "p18", storeId: "s9", name: "Full Home Wiring Check", description: "12-point safety audit + report.", price: 499, mrp: 799, emoji: "💡", image: IMG.electric, category: "Electrical", rating: 4.8, isVeg: true, stock: 99, unit: "Visit", tint: "#FFF4C2", eta: "60 mins" },
  { id: "p19", storeId: "s10", name: "Signature Facial (60 min)", description: "O3+ glow, head massage, at-home kit.", price: 1499, mrp: 2199, emoji: "✨", image: IMG.facial2, category: "Salon", rating: 4.9, isVeg: true, isBestseller: true, stock: 99, unit: "60 min", tint: "#FFE7F5", eta: "60 mins" },
  { id: "p20", storeId: "s11", name: "2BHK Deep Clean", description: "4 pros • 4 hrs • chemicals + machines.", price: 2999, mrp: 4499, emoji: "🧼", image: IMG.clean2, category: "Cleaning", rating: 4.7, isVeg: true, stock: 99, unit: "Service", tint: "#DFF7F3", eta: "90 mins" },
  { id: "p21", storeId: "s12", name: "Paracetamol + ORS Kit", description: "Fever care combo, pharmacist verified.", price: 129, mrp: 160, emoji: "💊", image: IMG.meds2, category: "Pharmacy", rating: 4.6, isVeg: true, stock: 200, unit: "Kit", tint: "#E3F2FF", eta: "15 mins" },
  { id: "p22", storeId: "s2", name: "Cold Coffee Frappe 350ml", description: "Double shot, jaggery, thick blend.", price: 149, mrp: 189, emoji: "🥤", image: IMG.coffee, category: "Beverages", rating: 4.5, isVeg: true, stock: 25, unit: "350 ml", tint: "#E8DCC8", eta: "12 mins" },
  { id: "p23", storeId: "s1", name: "Family Biryani Handi (Serves 4)", description: "Dum handi, 4 gulab jamun free.", price: 799, mrp: 999, emoji: "🍛", image: IMG.biryani3, category: "Biryani", rating: 4.8, isVeg: false, isBestseller: true, stock: 10, unit: "Serves 4", tint: "#FFE7C2", eta: "35 mins" },
  { id: "p24", storeId: "s3", name: "South Meals on Banana Leaf", description: "Rice, sambar, rasam, poriyal, curd.", price: 149, mrp: 189, emoji: "🍚", image: IMG.thali, category: "Meals", rating: 4.7, isVeg: true, stock: 32, unit: "Meals", tint: "#D8F3DC", eta: "18 mins" },
  { id: "p25", storeId: "s13", name: "Kaju Katli Box 500g", description: "Pure kaju, silver varq, festive box.", price: 549, mrp: 699, emoji: "🍬", image: IMG.mithai, category: "Sweets", rating: 4.9, isVeg: true, isBestseller: true, stock: 24, unit: "500 g", tint: "#FFE9C7", eta: "28 mins" },
  { id: "p26", storeId: "s13", name: "Mixed Mithai Gift Pack", description: "8 varieties, dry fruits, gift wrap.", price: 899, mrp: 1150, emoji: "🎁", image: IMG.mithai2, category: "Sweets", rating: 4.8, isVeg: true, stock: 18, unit: "1 kg", tint: "#FFF0C8", eta: "30 mins" },
  { id: "p27", storeId: "s14", name: "Belgian Chocolate Tub", description: "Slow-churned, 90% cocoa swirl.", price: 349, mrp: 429, emoji: "🍨", image: IMG.icecream2, category: "Ice Cream", rating: 4.8, isVeg: true, isBestseller: true, stock: 20, unit: "500 ml", tint: "#FFE3F0", eta: "20 mins" },
  { id: "p28", storeId: "s14", name: "Double Scoop Cone", description: "Pick any 2 gelato flavours.", price: 149, mrp: 189, emoji: "🍦", image: IMG.icecream, category: "Ice Cream", rating: 4.7, isVeg: true, stock: 40, unit: "1 cone", tint: "#FFF0F6", eta: "18 mins" },
  { id: "p29", storeId: "s15", name: "Wireless Headphones Pro", description: "ANC, 40hr battery, 1yr warranty.", price: 2499, mrp: 3999, emoji: "🎧", image: IMG.gadgets, category: "Audio", rating: 4.6, isVeg: true, isBestseller: true, stock: 12, unit: "1 unit", tint: "#E0F7FA", eta: "40 mins" },
  { id: "p30", storeId: "s15", name: "Fast Charger 65W + Cable", description: "GaN, type-C, laptop & phone.", price: 1299, mrp: 1899, emoji: "🔌", image: IMG.gadgets2, category: "Accessories", rating: 4.5, isVeg: true, stock: 26, unit: "1 set", tint: "#E8F4FF", eta: "40 mins" },
  { id: "p31", storeId: "s16", name: "Cordless Drill Kit", description: "18V, 2 batteries, 24 bits case.", price: 3499, mrp: 4999, emoji: "🛠️", image: IMG.tools, category: "Tools", rating: 4.6, isVeg: true, isBestseller: true, stock: 8, unit: "1 kit", tint: "#EFEBE9", eta: "35 mins" },
  { id: "p32", storeId: "s16", name: "Wall Paint 4L — Ivory", description: "Washable emulsion, low odour.", price: 1199, mrp: 1499, emoji: "🎨", image: IMG.tools2, category: "Paint", rating: 4.3, isVeg: true, stock: 30, unit: "4 L", tint: "#F5F0E8", eta: "35 mins" },
  { id: "p33", storeId: "s17", name: "Adult Dog Food 3kg", description: "Chicken & rice, vet approved.", price: 899, mrp: 1150, emoji: "🐶", image: IMG.petfood, category: "Pet Food", rating: 4.8, isVeg: false, isBestseller: true, stock: 22, unit: "3 kg", tint: "#FFF3E0", eta: "20 mins" },
  { id: "p34", storeId: "s17", name: "Training Treat Biscuits", description: "Grain-free, 200 pcs jar.", price: 329, mrp: 420, emoji: "🦴", image: IMG.petfood2, category: "Pet Food", rating: 4.7, isVeg: false, stock: 44, unit: "500 g", tint: "#FFF8E8", eta: "20 mins" },
  { id: "p35", storeId: "s18", name: "Mixed Lily Bouquet", description: "Seasonal lilies, jute wrap + card.", price: 649, mrp: 799, emoji: "💐", image: IMG.roses, category: "Flowers", rating: 4.9, isVeg: true, isBestseller: true, stock: 14, unit: "10 stems", tint: "#FFE3EE", eta: "25 mins" },
  { id: "p36", storeId: "s12", name: "Vitamin D3 + B12 Combo", description: "60 tablets, pharmacist verified.", price: 399, mrp: 520, emoji: "💊", image: IMG.meds, category: "Pharmacy", rating: 4.7, isVeg: true, stock: 90, unit: "60 tabs", tint: "#E3F2FF", eta: "15 mins" },
  { id: "p37", storeId: "s19", name: "Cotton Straight Kurti", description: "Breathable cotton, M–XXL, 5 colours.", price: 799, mrp: 1599, emoji: "👚", image: IMG.fashion, category: "Fashion", rating: 4.5, isVeg: true, isBestseller: true, stock: 35, unit: "1 pc", tint: "#FCE4EC", eta: "2 days" },
  { id: "p38", storeId: "s19", name: "Running Sneakers — Forest", description: "Knit upper, cushioned sole, sizes 6–10.", price: 1499, mrp: 2999, emoji: "👟", image: IMG.fashion2, category: "Footwear", rating: 4.6, isVeg: true, stock: 24, unit: "1 pair", tint: "#E8F5E9", eta: "2 days" },
  { id: "p39", storeId: "s20", name: "Vitamin C Skincare Kit", description: "Cleanser, serum, moisturiser — dermat tested.", price: 899, mrp: 1499, emoji: "🧴", image: IMG.beauty, category: "Beauty", rating: 4.7, isVeg: true, isBestseller: true, stock: 28, unit: "3 items", tint: "#F8BBD0", eta: "35 mins" },
  { id: "p40", storeId: "s21", name: "Accent Dining Chair", description: "Solid beech, fabric seat, set of 1.", price: 2499, mrp: 3999, emoji: "🪑", image: IMG.furniture, category: "Furniture", rating: 4.5, isVeg: true, stock: 10, unit: "1 chair", tint: "#D7CCC8", eta: "2 days" },
  { id: "p41", storeId: "s22", name: "Journal + Gel Pens Set", description: "A5 hardbound, 5 pastel pens.", price: 349, mrp: 599, emoji: "📓", image: IMG.books, category: "Stationery", rating: 4.8, isVeg: true, stock: 60, unit: "1 set", tint: "#BBDEFB", eta: "1 day" },
  { id: "p42", storeId: "s23", name: "Soft Plush Bear 40cm", description: "Huggy soft, washable, baby-safe.", price: 499, mrp: 799, emoji: "🧸", image: IMG.toys, category: "Toys", rating: 4.8, isVeg: true, isBestseller: true, stock: 40, unit: "1 pc", tint: "#FFE0B2", eta: "1 day" },
  { id: "p43", storeId: "s23", name: "Diaper Monthly Pack (M)", description: "72 soft-pants, rash-free, 7–12kg.", price: 999, mrp: 1249, emoji: "🍼", image: IMG.baby, category: "Baby Care", rating: 4.7, isVeg: true, stock: 33, unit: "72 pcs", tint: "#E1F5FE", eta: "1 day" },
  { id: "p44", storeId: "s24", name: "10kg Dumbbell Set", description: "PVC coated, anti-roll, home gym.", price: 1799, mrp: 2999, emoji: "🏋️", image: IMG.sports, category: "Fitness", rating: 4.6, isVeg: true, stock: 16, unit: "20 kg", tint: "#C8E6C9", eta: "1 day" },
  { id: "p45", storeId: "s25", name: "Car Mount + Gel Freshener", description: "Magnetic mount + long-lasting freshener.", price: 399, mrp: 699, emoji: "🚗", image: IMG.auto, category: "Auto", rating: 4.4, isVeg: true, stock: 52, unit: "1 kit", tint: "#CFD8DC", eta: "1 day" },
  { id: "p46", storeId: "s26", name: "65W GaN Charger Bundle", description: "Charger + braided C-to-C 1.5m.", price: 1099, mrp: 1799, emoji: "🔌", image: IMG.mobile, category: "Mobile Accessories", rating: 4.6, isVeg: true, isBestseller: true, stock: 38, unit: "1 set", tint: "#C5CAE9", eta: "35 mins" },
  { id: "p47", storeId: "s27", name: "Non-Stick Cookware 3-Pc", description: "Kadhai, pan, tawa — induction ready.", price: 1899, mrp: 3499, emoji: "🍳", image: IMG.kitchen, category: "Kitchen", rating: 4.5, isVeg: true, stock: 14, unit: "3 pcs", tint: "#D7CCC8", eta: "1 day" },
  { id: "p48", storeId: "s28", name: "Liquid Detergent Family Pack", description: "2L + 1L refill, top & front load.", price: 449, mrp: 599, emoji: "🧴", image: IMG.cleaning, category: "Household", rating: 4.6, isVeg: true, isBestseller: true, stock: 70, unit: "3 L", tint: "#B2DFDB", eta: "18 mins" },
];

export const CATS = [
  { k: "biryani", t: "Biryani", img: IMG.biryani1 },
  { k: "burger", t: "Burger", img: IMG.burger1 },
  { k: "dosa", t: "Dosa", img: IMG.dosa1 },
  { k: "veg", t: "Veggies", img: IMG.tomato },
  { k: "milk", t: "Milk", img: IMG.milk },
  { k: "mango", t: "Fruits", img: IMG.mango },
  { k: "cake", t: "Cakes", img: IMG.cakeSlice },
  { k: "salon", t: "Salon", img: IMG.facial },
  { k: "plumber", t: "Plumber", img: IMG.plumber },
  { k: "meds", t: "Meds", img: IMG.meds },
];

export const COUPONS = [
  { code: "BAZAR50", title: "50% OFF up to ₹100", detail: "On orders above ₹199 • All stores", offPct: 50, maxOff: 100, minOrder: 199 },
  { code: "FRESH20", title: "20% fresh cashback", detail: "Grocery • up to ₹80", offPct: 20, maxOff: 80, minOrder: 149 },
  { code: "HOMESERVE", title: "₹200 OFF home services", detail: "On first service booking", offPct: 25, maxOff: 200, minOrder: 499 },
  { code: "FREEDEL", title: "Free delivery", detail: "On 3 orders this week", offPct: 100, maxOff: 35, minOrder: 99 },
];

export function greetingForHour(h: number) {
  if (h < 5) return { label: "Late night cravings?", sub: "24×7 meds, ice-cream & comfort", mood: "night" as const };
  if (h < 11) return { label: "Good morning", sub: "Hot breakfast, fresh milk & greens nearby", mood: "morning" as const };
  if (h < 16) return { label: "Good afternoon", sub: "Lunch specials & grocery top-ups", mood: "afternoon" as const };
  if (h < 20) return { label: "Good evening", sub: "Snacks, bakeries & chai time", mood: "evening" as const };
  return { label: "Good night", sub: "Dinner, desserts & late-night essentials", mood: "night" as const };
}

export const TRENDING = ["biryani near me", "A2 milk subscription", "plumber in 45 mins", "alphonso mango", "midnight cake", "deep cleaning", "dosa breakfast", "paracetamol 15 min"];

export const WEEKLY = [
  { d: "M", v: 42 }, { d: "T", v: 58 }, { d: "W", v: 47 }, { d: "T", v: 72 }, { d: "F", v: 88 }, { d: "S", v: 96 }, { d: "S", v: 64 },
];

export function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
