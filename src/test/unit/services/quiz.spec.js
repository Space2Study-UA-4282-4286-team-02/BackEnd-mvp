const quizService = require('~/services/quiz')
const Quiz = require('~/models/quiz')

jest.mock('~/models/quiz', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn()
}))

describe('Quiz service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns quizzes with count', async () => {
    const items = [
      { _id: 'quiz-1', title: 'Quiz 1' },
      { _id: 'quiz-2', title: 'Quiz 2' }
    ]
    const exec = jest.fn().mockResolvedValue(items)
    const lean = jest.fn().mockReturnValue({ exec })
    const limit = jest.fn().mockReturnValue({ lean })
    const skip = jest.fn().mockReturnValue({ limit })
    const sort = jest.fn().mockReturnValue({ skip })
    const populate = jest.fn().mockReturnValue({ sort })
    const collation = jest.fn().mockReturnValue({ populate })
    Quiz.find.mockReturnValue({ collation })
    Quiz.countDocuments.mockResolvedValue(2)

    const result = await quizService.getQuizzes({ author: 'user-id' }, { updatedAt: 'asc' }, 0, 10)

    expect(Quiz.find).toHaveBeenCalledWith({ author: 'user-id' })
    expect(collation).toHaveBeenCalledWith({ locale: 'en', strength: 1 })
    expect(populate).toHaveBeenCalledWith({ path: 'category', select: '_id name' })
    expect(sort).toHaveBeenCalledWith({ updatedAt: 'asc' })
    expect(skip).toHaveBeenCalledWith(0)
    expect(limit).toHaveBeenCalledWith(10)
    expect(result).toEqual({ items, count: 2 })
  })

  it('returns quiz by id for owner', async () => {
    const quiz = { _id: 'quiz-id', title: 'Quiz title', author: 'author-id' }
    const exec = jest.fn().mockResolvedValue(quiz)
    const lean = jest.fn().mockReturnValue({ exec })
    const populateItems = jest.fn().mockReturnValue({ lean })
    const populateCategory = jest.fn().mockReturnValue({ populate: populateItems })

    Quiz.findById.mockReturnValue({ populate: populateCategory })

    const result = await quizService.getQuizById('quiz-id', 'author-id', 'tutor')

    expect(Quiz.findById).toHaveBeenCalledWith('quiz-id')
    expect(populateCategory).toHaveBeenCalledWith({ path: 'category', select: '_id name' })
    expect(populateItems).toHaveBeenCalledWith({ path: 'items' })
    expect(result).toEqual(quiz)
  })

  it('throws not found when quiz does not exist', async () => {
    const exec = jest.fn().mockResolvedValue(null)
    const lean = jest.fn().mockReturnValue({ exec })
    const populateItems = jest.fn().mockReturnValue({ lean })
    const populateCategory = jest.fn().mockReturnValue({ populate: populateItems })

    Quiz.findById.mockReturnValue({ populate: populateCategory })

    await expect(
      quizService.getQuizById('missing-id', 'author-id', 'tutor')
    ).rejects.toMatchObject({ status: 404, code: 'DOCUMENT_NOT_FOUND' })
  })

  it('throws forbidden when non-owner tries to read', async () => {
    const quiz = { _id: 'quiz-id', author: 'author-id' }
    const exec = jest.fn().mockResolvedValue(quiz)
    const lean = jest.fn().mockReturnValue({ exec })
    const populateItems = jest.fn().mockReturnValue({ lean })
    const populateCategory = jest.fn().mockReturnValue({ populate: populateItems })

    Quiz.findById.mockReturnValue({ populate: populateCategory })

    await expect(
      quizService.getQuizById('quiz-id', 'other-user', 'tutor')
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })
})
