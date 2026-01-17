const lessonService = require('~/services/lesson')
const Lesson = require('~/models/lesson')

jest.mock('~/models/lesson', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
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

  it('returns lessons with count', async () => {
    const items = [
      { _id: 'lesson-1', title: 'Lesson 1' },
      { _id: 'lesson-2', title: 'Lesson 2' }
    ]
    const exec = jest.fn().mockResolvedValue(items)
    const limit = jest.fn().mockReturnValue({ exec })
    const skip = jest.fn().mockReturnValue({ limit })
    const sort = jest.fn().mockReturnValue({ skip })
    const populate = jest.fn().mockReturnValue({ sort })
    const collation = jest.fn().mockReturnValue({ populate })
    Lesson.find.mockReturnValue({ collation })
    Lesson.countDocuments.mockResolvedValue(2)

    const result = await lessonService.getLessons({ author: 'user-id' }, { updatedAt: 'asc' }, 0, 10)

    expect(Lesson.find).toHaveBeenCalledWith({ author: 'user-id' })
    expect(collation).toHaveBeenCalledWith({ locale: 'en', strength: 1 })
    expect(populate).toHaveBeenCalledWith({ path: 'category', select: '_id name' })
    expect(sort).toHaveBeenCalledWith({ updatedAt: 'asc' })
    expect(skip).toHaveBeenCalledWith(0)
    expect(limit).toHaveBeenCalledWith(10)
    expect(result).toEqual({ items, count: 2 })
  })
})
