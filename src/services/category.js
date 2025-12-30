const { createError } = require('~/utils/errorsHelper')
const { DOCUMENT_NOT_FOUND } = require('~/consts/errors')
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
  },

  getCategoryById: async (id) => {
    const category = await Category.findById(id).lean().exec()

    if (!category) {
      throw createError(404, DOCUMENT_NOT_FOUND([Category.modelName]))
    }

    return category
  }
}

module.exports = categoryService
