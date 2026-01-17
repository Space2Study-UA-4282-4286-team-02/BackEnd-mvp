const lessonService = require('~/services/lesson')
const Lesson = require('~/models/lesson')

jest.mock('~/models/lesson', () => ({
  create: jest.fn()
}))

describe('Lesson service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates lesson and populates category', async () => {
    const payload = {
      title: 'Lesson title',
      description: 'Lesson description',
      content: 'Lesson content',
      attachments: [],
      category: 'category-id'
    }
    const populatedLesson = { _id: 'lesson-id', title: payload.title }
    const populate = jest.fn().mockResolvedValue(populatedLesson)

    Lesson.create.mockResolvedValue({ populate })

    const result = await lessonService.createLesson('author-id', payload)

    expect(Lesson.create).toHaveBeenCalledWith({
      title: payload.title,
      description: payload.description,
      content: payload.content,
      attachments: payload.attachments,
      category: payload.category,
      author: 'author-id'
    })
    expect(populate).toHaveBeenCalledWith({ path: 'category', select: '_id name' })
    expect(result).toBe(populatedLesson)
  })
})
