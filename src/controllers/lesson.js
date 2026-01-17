const lessonService = require('~/services/lesson')

const createLesson = async (req, res) => {
  const { id: authorId } = req.user
  const data = req.body

  const newLesson = await lessonService.createLesson(authorId, data)

  res.status(201).json(newLesson)
}

module.exports = {
  createLesson
}
