import mongoose from "mongoose";
import dotenv from "dotenv";
import Menu from "./models/Menu.js";

dotenv.config();

const initialMenu = [
  {
    name: "Jollof Rice",
    category: "Rice Dishes",
    price: 100,
    description: "Smoky tomato-based rice",
  },
  {
    name: "Fried Rice",
    category: "Rice Dishes",
    price: 100,
    description: "Mixed vegetable and soy-based rice",
  },
  {
    name: "Ofada Rice",
    category: "Rice Dishes",
    price: 170,
    description: "Local short-grain rice served with spicy Ayamase sauce",
  },
  {
    name: "Coconut Rice",
    category: "Rice Dishes",
    price: 150,
    description: "Rice cooked in coconut milk",
  },
  {
    name: "White Rice & Stew",
    category: "Rice Dishes",
    price: 150,
    description: "Served with tomato-based meat stew",
  },
  {
    name: "Pounded Yam",
    category: "Swallow & Soups",
    price: 150,
    description: "Smooth, stretchy boiled yam",
  },
  {
    name: "Eba",
    category: "Swallow & Soups",
    price: 120,
    description: "Made from garri (dried grated cassava)",
  },
  {
    name: "Amala",
    category: "Swallow & Soups",
    price: 140,
    description: "Made from yam flour or cassava flour",
  },
  {
    name: "Fufu",
    category: "Swallow & Soups",
    price: 120,
    description: "Cassava-based dough",
  },
  {
    name: "Egusi Soup",
    category: "Swallow & Soups",
    price: 150,
    description: "Ground melon seed soup",
  },
  {
    name: "Ogbono Soup",
    category: "Swallow & Soups",
    price: 150,
    description: "Thickener made from ground African mango seeds",
  },
  {
    name: "Efo Riro",
    category: "Swallow & Soups",
    price: 170,
    description: "Rich spinach stew",
  },
  {
    name: "Okro/Okra Soup",
    category: "Swallow & Soups",
    price: 170,
    description: "A draw soup",
  },
  {
    name: "Afang Soup",
    category: "Swallow & Soups",
    price: 200,
    description: "Vegetable soup",
  },
  {
    name: "Banga Soup",
    category: "Swallow & Soups",
    price: 170,
    description: "Palm fruit soup",
  },
  {
    name: "Ewa Agoyin",
    category: "Beans and Tubers",
    price: 140,
    description: "Cooked beans served with a spicy pepper sauce",
  },
  {
    name: "Porridge Beans",
    category: "Beans and Tubers",
    price: 120,
    description: "Stewed brown beans",
  },
  {
    name: "Yam Porridge/Asaro",
    category: "Beans and Tubers",
    price: 150,
    description: "Boiled mashed yam with palm oil",
  },
  {
    name: "Fried Yam",
    category: "Beans and Tubers",
    price: 200,
    description: "Served with stew or fried eggs",
  },
  {
    name: "Boli",
    category: "Beans and Tubers",
    price: 200,
    description: "Roasted plantain",
  },
  {
    name: "Suya",
    category: "Snacks and Protein",
    price: 400,
    description: "Spicy grilled beef or chicken",
  },
  {
    name: "Moin Moin",
    category: "Snacks and Protein",
    price: 100,
    description: "Steamed bean pudding",
  },
  {
    name: "Puff-Puff",
    category: "Snacks and Protein",
    price: 100,
    description: "Fried sweet dough",
  },
  {
    name: "Peppered Gizzard/Snails",
    category: "Snacks and Protein",
    price: 500,
    description: "Spicy assorted meats",
  },
  {
    name: "Meat Pie",
    category: "Snacks and Protein",
    price: 200,
    description: "Pastry filled with minced meat and vegetables",
  },
  {
    name: "Akara",
    category: "Snacks and Protein",
    price: 150,
    description: "Fried bean cakes",
  },
  {
    name: "Zobo",
    category: "Drinks",
    price: 200,
    description: "Hibiscus leaf drink",
  },
  {
    name: "Palm Wine",
    category: "Drinks",
    price: 400,
    description: "Natural fermented sap",
  },
  {
    name: "Kunu",
    category: "Drinks",
    price: 200,
    description: "Millet-based drink",
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Seed engine linked to MongoDB successfully...");

    // Clean slate configuration
    await Menu.deleteMany({});
    console.log("Stale menu definitions dropped.");

    await Menu.insertMany(initialMenu);
    console.log("Standard core dishes seeded successfully into the database.");

    process.exit(0);
  } catch (error) {
    console.error("Seeding operation encountered an error:", error);
    process.exit(1);
  }
};

seedDatabase();
