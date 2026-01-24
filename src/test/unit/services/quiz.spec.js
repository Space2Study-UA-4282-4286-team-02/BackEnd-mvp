const quizService = require('~/services/quiz')
const Quiz = require('~/models/quiz')
const {
  roles: { ADMIN }
} = require('~/consts/auth')

jest.mock('~/models/quiz', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  modelName: 'Quiz'
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

  it('updates quiz for owner', async () => {
    const quiz = {
      author: { toString: () => 'author-id' },
      validate: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockResolvedValue({ _id: 'quiz-id', title: 'Updated title' })
    }

    Quiz.findById.mockResolvedValue(quiz)

    const result = await quizService.updateQuiz('quiz-id', 'author-id', 'tutor', {
      title: 'Updated title',
      unknown: 'ignored'
    })

    expect(quiz.title).toBe('Updated title')
    expect(quiz.unknown).toBeUndefined()
    expect(quiz.validate).toHaveBeenCalled()
    expect(quiz.save).toHaveBeenCalled()
    expect(result).toEqual({ _id: 'quiz-id', title: 'Updated title' })
  })

  it('allows admin to update quiz', async () => {
    const quiz = {
      author: { toString: () => 'author-id' },
      validate: jest.fn().mockResolvedValue(),
      save: jest.fn().mockResolvedValue(),
      populate: jest.fn().mockResolvedValue({ _id: 'quiz-id', title: 'Admin update' })
    }

    Quiz.findById.mockResolvedValue(quiz)

    const result = await quizService.updateQuiz('quiz-id', 'admin-id', ADMIN, {
      title: 'Admin update'
    })

    expect(result.title).toBe('Admin update')
  })

  it('throws forbidden when non-owner tries to update', async () => {
    const quiz = {
      author: { toString: () => 'author-id' }
    }

    Quiz.findById.mockResolvedValue(quiz)

    await expect(
      quizService.updateQuiz('quiz-id', 'other-user', 'tutor', { title: 'Hack' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('throws not found for missing quiz', async () => {
    Quiz.findById.mockResolvedValue(null)

    await expect(
      quizService.updateQuiz('missing-id', 'author-id', 'tutor', { title: 'Update' })
    ).rejects.toMatchObject({ status: 404, code: 'DOCUMENT_NOT_FOUND' })
  })
})
