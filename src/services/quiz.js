const Quiz = require('~/models/quiz')

const quizService = {
  createQuiz: async (author, data) => {
    const { title, description, items, category, resourceType, settings } = data

    const quiz = await Quiz.create({
      title,
      description,
      items,
      author,
      category,
      resourceType,
      settings
    })

    return await quiz.populate([
      { path: 'items', select: '_id title text type' },
      { path: 'author', select: '_id firstName lastName email' },
      { path: 'category', select: '_id name' }
    ])
  }
}

module.exports = quizService
