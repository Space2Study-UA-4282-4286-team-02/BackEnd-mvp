const Lesson = require('~/models/lesson')

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
