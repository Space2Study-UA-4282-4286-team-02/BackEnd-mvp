const quizService = require('~/services/quiz')
const QuizModel = require('~/models/quiz')

jest.mock('~/models/quiz', () => ({
  create: jest.fn()
}))

describe('Quiz service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates quiz and populates related entities', async () => {
    const authorId = 'author-id'
    const payload = {
      title: 'Geometry Basics',
      description: 'Quiz covering triangles',
      items: ['question-id'],
      category: 'category-id',
      resourceType: 'quizzes',
      settings: {
        showCorrectAnswers: true,
        shuffleQuestions: true,
        quizView: 'Stepper'
      }
    }

    const populatedQuiz = { _id: 'quiz-id', title: payload.title }
    const populate = jest.fn().mockResolvedValue(populatedQuiz)
    QuizModel.create.mockResolvedValue({ populate })

    const result = await quizService.createQuiz(authorId, payload)

    expect(QuizModel.create).toHaveBeenCalledWith({
      title: payload.title,
      description: payload.description,
      items: payload.items,
      author: authorId,
      category: payload.category,
      resourceType: payload.resourceType,
      settings: payload.settings
    })
    expect(populate).toHaveBeenCalledWith([
      { path: 'items', select: '_id title text type' },
      { path: 'author', select: '_id firstName lastName email' },
      { path: 'category', select: '_id name' }
    ])
    expect(result).toBe(populatedQuiz)
  })

  it('propagates errors thrown during creation', async () => {
    const dbError = new Error('Database failure')
    QuizModel.create.mockRejectedValue(dbError)

    await expect(
      quizService.createQuiz('author-id', {
        title: 'Invalid quiz',
        description: 'Should fail',
        items: ['question-id']
      })
    ).rejects.toBe(dbError)
  })
})
