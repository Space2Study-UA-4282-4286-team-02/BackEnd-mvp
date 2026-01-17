const Lesson = require('~/models/lesson')
const filterAllowedFields = require('~/utils/filterAllowedFields')
const { createError, createForbiddenError } = require('~/utils/errorsHelper')
const { DOCUMENT_NOT_FOUND } = require('~/consts/errors')
const {
  roles: { ADMIN, SUPERADMIN }
} = require('~/consts/auth')
const { allowedLessonFieldsForUpdate } = require('~/validation/services/lesson')

const lessonService = {
  getLessons: async (match, sort, skip = 0, limit = 10) => {
    const items = await Lesson.find(match)
      .collation({ locale: 'en', strength: 1 })
      .populate({ path: 'category', select: '_id name' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()
    const count = await Lesson.countDocuments(match)

    return { items, count }
  },

  updateLesson: async (id, currentUserId, currentUserRole, updateData) => {
    const filteredUpdateData = filterAllowedFields(updateData, allowedLessonFieldsForUpdate)

    const lesson = await Lesson.findById(id)

    if (!lesson) {
      throw createError(404, DOCUMENT_NOT_FOUND([Lesson.modelName]))
    }

    const isPrivileged = currentUserRole === ADMIN || currentUserRole === SUPERADMIN
    if (!isPrivileged && lesson.author.toString() !== currentUserId) {
      throw createForbiddenError()
    }

    for (let field in filteredUpdateData) {
      lesson[field] = filteredUpdateData[field]
    }

    await lesson.validate()
    await lesson.save()

    return lesson.populate({ path: 'category', select: '_id name' })
  },

  createLesson: async (author, data) => {
    const { title, description, content, attachments, category } = data

    const lesson = await Lesson.create({
      title,
      description,
      content,
      attachments,
      category,
      author
    })

    return lesson.populate({ path: 'category', select: '_id name' })
  }
}

module.exports = lessonService
