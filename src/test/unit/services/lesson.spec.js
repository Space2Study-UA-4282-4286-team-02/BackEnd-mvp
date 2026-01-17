const lessonService = require('~/services/lesson')
const Lesson = require('~/models/lesson')
const {
  roles: { ADMIN }
} = require('~/consts/auth')

jest.mock('~/models/lesson', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndRemove: jest.fn()
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

  it('returns lesson by id', async () => {
    const lesson = { _id: 'lesson-id', title: 'Lesson title' }
    const exec = jest.fn().mockResolvedValue(lesson)
    const lean = jest.fn().mockReturnValue({ exec })
    const populate = jest.fn().mockReturnValue({ lean })

    Lesson.findById.mockReturnValue({ populate })

    const result = await lessonService.getLessonById('lesson-id')

    expect(Lesson.findById).toHaveBeenCalledWith('lesson-id')
    expect(populate).toHaveBeenCalledWith({ path: 'category', select: '_id name' })
    expect(result).toEqual(lesson)
  })

  it('throws not found when lesson does not exist', async () => {
    const exec = jest.fn().mockResolvedValue(null)
    const lean = jest.fn().mockReturnValue({ exec })
    const populate = jest.fn().mockReturnValue({ lean })

    Lesson.findById.mockReturnValue({ populate })

    await expect(lessonService.getLessonById('missing-id')).rejects.toMatchObject({
      status: 404,
      code: 'DOCUMENT_NOT_FOUND'
    })
  })

  it('updates lesson for owner', async () => {
    const lesson = {
      author: { toString: () => 'author-id' },
      validate: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockResolvedValue({ _id: 'lesson-id', title: 'Updated title' })
    }

    Lesson.findById.mockResolvedValue(lesson)

    const result = await lessonService.updateLesson('lesson-id', 'author-id', 'tutor', {
      title: 'Updated title',
      unknown: 'ignored'
    })

    expect(lesson.title).toBe('Updated title')
    expect(lesson.unknown).toBeUndefined()
    expect(lesson.validate).toHaveBeenCalled()
    expect(lesson.save).toHaveBeenCalled()
    expect(result).toEqual({ _id: 'lesson-id', title: 'Updated title' })
  })

  it('allows admin to update lesson', async () => {
    const lesson = {
      author: { toString: () => 'author-id' },
      validate: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockResolvedValue({ _id: 'lesson-id', title: 'Admin update' })
    }

    Lesson.findById.mockResolvedValue(lesson)

    const result = await lessonService.updateLesson('lesson-id', 'admin-id', ADMIN, {
      title: 'Admin update'
    })

    expect(result.title).toBe('Admin update')
  })

  it('throws forbidden when non-owner tries to update', async () => {
    const lesson = {
      author: { toString: () => 'author-id' }
    }

    Lesson.findById.mockResolvedValue(lesson)

    await expect(
      lessonService.updateLesson('lesson-id', 'other-user', 'tutor', { title: 'Hack' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('throws not found for missing lesson', async () => {
    Lesson.findById.mockResolvedValue(null)

    await expect(
      lessonService.updateLesson('missing-id', 'author-id', 'tutor', { title: 'Update' })
    ).rejects.toMatchObject({ status: 404, code: 'DOCUMENT_NOT_FOUND' })
  })

  it('deletes lesson for owner', async () => {
    const lesson = {
      author: { toString: () => 'author-id' }
    }

    Lesson.findById.mockResolvedValue(lesson)
    Lesson.findByIdAndRemove.mockReturnValue({ exec: jest.fn().mockResolvedValue() })

    await lessonService.deleteLesson('lesson-id', 'author-id', 'tutor')

    expect(Lesson.findByIdAndRemove).toHaveBeenCalledWith('lesson-id')
  })

  it('throws forbidden when non-owner tries to delete', async () => {
    const lesson = {
      author: { toString: () => 'author-id' }
    }

    Lesson.findById.mockResolvedValue(lesson)

    await expect(lessonService.deleteLesson('lesson-id', 'other-user', 'tutor')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN'
    })
  })

  it('throws not found when deleting missing lesson', async () => {
    Lesson.findById.mockResolvedValue(null)

    await expect(lessonService.deleteLesson('missing-id', 'author-id', 'tutor')).rejects.toMatchObject({
      status: 404,
      code: 'DOCUMENT_NOT_FOUND'
    })
  })
})
