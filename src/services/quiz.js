const Quiz = require('~/models/quiz')

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
  }
}

module.exports = quizService
