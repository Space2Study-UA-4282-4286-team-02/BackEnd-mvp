const quizService = require('~/services/quiz')
const Quiz = require('~/models/quiz')

jest.mock('~/models/quiz', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
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
})
