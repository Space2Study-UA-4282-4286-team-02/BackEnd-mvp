const { createError } = require('~/utils/errorsHelper')
const { DOCUMENT_NOT_FOUND } = require('~/consts/errors')
const Category = require('~/models/category')
const Subject = require('~/models/subject')
const categoriesAggregateOptions = require('~/utils/categories/categoriesAggregateOptions')
const categoryNamesAggregateOptions = require('~/utils/categories/categoryNamesAggregateOptions')

const categoryService = {
  createCategory: async (categoryData) => {
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
  },

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
  },

  getSubjectNamesByCategoryId: async (id) => {
    const categoryExists = await Category.exists({ _id: id }).exec()

    if (!categoryExists) {
      throw createError(404, DOCUMENT_NOT_FOUND([Category.modelName]))
    }

    return await Subject.find({ category: id }).select('name').lean().exec()
  }
}

module.exports = categoryService
