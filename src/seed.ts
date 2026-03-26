import { collection, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

const CATEGORIES = [
  { name: 'Burgers', image: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', order: 1 },
  { name: 'Fries', image: 'https://cdn-icons-png.flaticon.com/512/1046/1046786.png', order: 2 },
  { name: 'Drinks', image: 'https://cdn-icons-png.flaticon.com/512/2405/2405479.png', order: 3 },
  { name: 'Combos', image: 'https://cdn-icons-png.flaticon.com/512/3075/3075929.png', order: 4 },
  { name: 'Desserts', image: 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png', order: 5 },
];

const MENU_ITEMS = [
  {
    name: 'Snaxy Classic Burger',
    description: 'Double beef patty, cheddar cheese, secret sauce, and fresh lettuce on a brioche bun.',
    price: 12.99,
    categoryId: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isFeatured: true,
    calories: 850
  },
  {
    name: 'Spicy Chicken Deluxe',
    description: 'Crispy spicy chicken breast, jalapeños, pepper jack cheese, and chipotle mayo.',
    price: 11.49,
    categoryId: 'Burgers',
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isFeatured: true,
    calories: 720
  },
  {
    name: 'Truffle Parmesan Fries',
    description: 'Hand-cut fries tossed in truffle oil and aged parmesan cheese.',
    price: 6.99,
    categoryId: 'Fries',
    image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isFeatured: false,
    calories: 450
  },
  {
    name: 'Classic Vanilla Shake',
    description: 'Creamy Madagascar vanilla bean ice cream blended with fresh milk.',
    price: 5.49,
    categoryId: 'Drinks',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isFeatured: false,
    calories: 580
  },
  {
    name: 'The Ultimate Combo',
    description: 'Classic Burger, Large Fries, and a Shake of your choice.',
    price: 22.99,
    categoryId: 'Combos',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isFeatured: true,
    calories: 1800
  }
];

export async function seedDatabase() {
  try {
    const catsSnap = await getDocs(collection(db, 'categories'));
    if (!catsSnap.empty) return; // Already seeded

    console.log('Seeding database...');
    const categoryIds: Record<string, string> = {};

    for (const cat of CATEGORIES) {
      const docRef = await addDoc(collection(db, 'categories'), cat);
      categoryIds[cat.name] = docRef.id;
    }

    for (const item of MENU_ITEMS) {
      await addDoc(collection(db, 'menuItems'), {
        ...item,
        categoryId: categoryIds[item.categoryId]
      });
    }
    console.log('Seeding complete!');
  } catch (error) {
    // Silently fail if permissions are missing (e.g. non-admin user)
    console.warn('Seeding skipped or failed due to permissions:', error);
  }
}
