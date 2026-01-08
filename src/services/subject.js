const mongoose = require('mongoose')
const Category = require('~/models/category')
const Subject = require('~/models/subject')
const { DOCUMENT_NOT_FOUND, INVALID_ID } = require('~/consts/errors')
const { createError } = require('~/utils/errorsHelper')
const getRegex = require('~/utils/getRegex')
const filterAllowedFields = require('~/utils/filterAllowedFields')
const { allowedSubjectFieldsForUpdate } = require('~/validation/services/subject')

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
  },

  getSubjectById: async (id) => {
    const subject = await Subject.findById(id).lean().exec()

    if (!subject) {
      throw createError(404, DOCUMENT_NOT_FOUND([Subject.modelName]))
    }

    return subject
  },

  createSubject: async (data) => {
    const { name, category } = data

    if (!mongoose.Types.ObjectId.isValid(category)) {
      throw createError(400, INVALID_ID)
    }

    const categoryExists = await Category.exists({ _id: category }).exec()

    if (!categoryExists) {
      throw createError(404, DOCUMENT_NOT_FOUND([Category.modelName]))
    }

    const subject = await Subject.create({ name, category })

    return subject.toObject()
  },

  updateSubject: async (id, updateData) => {
    const filteredUpdateData = filterAllowedFields(updateData, allowedSubjectFieldsForUpdate)

    if (filteredUpdateData.category) {
      if (!mongoose.Types.ObjectId.isValid(filteredUpdateData.category)) {
        throw createError(400, INVALID_ID)
      }

      const categoryExists = await Category.exists({ _id: filteredUpdateData.category }).exec()

      if (!categoryExists) {
        throw createError(404, DOCUMENT_NOT_FOUND([Category.modelName]))
      }
    }

    const subject = await Subject.findById(id).exec()

    if (!subject) {
      throw createError(404, DOCUMENT_NOT_FOUND([Subject.modelName]))
    }

    for (let field in filteredUpdateData) {
      subject[field] = filteredUpdateData[field]
    }

    await subject.validate()
    await subject.save()
  },

  deleteSubject: async (id) => {
    const subject = await Subject.findByIdAndRemove(id).lean().exec()

    if (!subject) {
      throw createError(404, DOCUMENT_NOT_FOUND([Subject.modelName]))
    }
  }
}

module.exports = subjectService
