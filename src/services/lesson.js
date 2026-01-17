const Lesson = require('~/models/lesson')

const lessonService = {
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
