const Category = require('~/models/category')

exports.createCategory = async (categoryData) => {
  try {
    const category = new Category(categoryData)
    const saved = await category.save()
    return saved.toObject()
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('Category already exists')
      e.code = 11000
      e.status = 409
      e.keyValue = err.keyValue
      throw e
    }

    throw err
  }
}
