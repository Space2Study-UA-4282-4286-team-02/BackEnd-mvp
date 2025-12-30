const Category = require('~/models/category')
const categoriesAggregateOptions = require('~/utils/categories/categoriesAggregateOptions')
const categoryNamesAggregateOptions = require('~/utils/categories/categoryNamesAggregateOptions')

const categoryService = {
  getCategories: async (query) => {
    const [response] = await Category.aggregate(categoriesAggregateOptions(query)).exec()
    return response || { items: [], count: 0 }
  },

  getCategoriesNames: async () => {
    return await Category.aggregate(categoryNamesAggregateOptions()).exec()
  }
}

module.exports = categoryService
