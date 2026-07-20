import { connectDB, CategoryModel } from './_db';

const defaultCategories = [
  { name: 'Ăn uống', icon: 'Utensils', color: 'red', order: 0 },
  { name: 'Di chuyển', icon: 'Car', color: 'amber', order: 1 },
  { name: 'Mua sắm', icon: 'ShoppingBag', color: 'blue', order: 2 },
  { name: 'Hóa đơn', icon: 'Zap', color: 'teal', order: 3 },
  { name: 'Lương', icon: 'Banknote', color: 'emerald', order: 4 },
  { name: 'Khác', icon: 'Tag', color: 'slate', order: 5 },
];

export const handler = async (event: any) => {
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    await connectDB();

    // GET — list all
    if (method === 'GET') {
      const cats = await CategoryModel.find().sort({ order: 1 });
      // Seed defaults if empty
      if (cats.length === 0) {
        await CategoryModel.insertMany(defaultCategories);
        const seeded = await CategoryModel.find().sort({ order: 1 });
        return { statusCode: 200, body: JSON.stringify(seeded) };
      }
      return { statusCode: 200, body: JSON.stringify(cats) };
    }

    // POST — create
    if (method === 'POST') {
      const count = await CategoryModel.countDocuments();
      const cat = await CategoryModel.create({ ...body, order: count });
      return { statusCode: 201, body: JSON.stringify(cat) };
    }

    // PUT — update (rename, icon, color, order)
    if (method === 'PUT') {
      const { _id, ...update } = body;
      const cat = await CategoryModel.findByIdAndUpdate(_id, update, { new: true });
      return { statusCode: 200, body: JSON.stringify(cat) };
    }

    // DELETE
    if (method === 'DELETE') {
      await CategoryModel.findByIdAndDelete(body._id);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // PUT /reorder — batch update order
    if (method === 'PUT' && event.path?.endsWith('/reorder')) {
      const { orderedIds } = body;
      for (let i = 0; i < orderedIds.length; i++) {
        await CategoryModel.findByIdAndUpdate(orderedIds[i], { order: i });
      }
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
