const Category = require('~/models/category')
const Subject = require('~/models/subject')
const { DOCUMENT_NOT_FOUND } = require('~/consts/errors')
const { createError } = require('~/utils/errorsHelper')
const getRegex = require('~/utils/getRegex')

const subjectService = {
  getSubjects: async ({ name = '', skip = 0, limit = 100, categoryId } = {}) => {
    if (categoryId) {
      const categoryExists = await Category.exists({ _id: categoryId }).exec()

      if (!categoryExists) {
        throw createError(404, DOCUMENT_NOT_FOUND([Category.modelName]))
      }
    }

    const match = { name: getRegex(name) }

    if (categoryId) {
      match.category = categoryId
    }

    const items = await Subject.find(match)
      .sort({ 'totalOffers.tutor': -1, 'totalOffers.student': -1, updatedAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean()
      .exec()

    const count = await Subject.countDocuments(match).exec()

    return { items, count }
  }
}

module.exports = subjectService
