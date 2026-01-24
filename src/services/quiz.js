const Quiz = require('~/models/quiz')
const { createError, createForbiddenError } = require('~/utils/errorsHelper')
const { DOCUMENT_NOT_FOUND } = require('~/consts/errors')
const {
  roles: { ADMIN, SUPERADMIN }
} = require('~/consts/auth')

const quizService = {
  getQuizzes: async (match, sort, skip = 0, limit = 10) => {
    const items = await Quiz.find(match)
      .collation({ locale: 'en', strength: 1 })
      .populate({ path: 'category', select: '_id name' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()
    const count = await Quiz.countDocuments(match)

    return { items, count }
  },

  getQuizById: async (id, currentUserId, currentUserRole) => {
    const quiz = await Quiz.findById(id)
      .populate({ path: 'category', select: '_id name' })
      .populate({ path: 'items' })
      .lean()
      .exec()

    if (!quiz) {
      throw createError(404, DOCUMENT_NOT_FOUND([Quiz.modelName]))
    }

    const isPrivileged = currentUserRole === ADMIN || currentUserRole === SUPERADMIN
    if (!isPrivileged && quiz.author.toString() !== currentUserId) {
      throw createForbiddenError()
    }

    return quiz
  }
}

module.exports = quizService
