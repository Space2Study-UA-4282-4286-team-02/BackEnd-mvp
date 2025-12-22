const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const questionService = require('~/services/question')
const Question = require('~/models/question')
const User = require('~/models/user')
const ResourcesCategory = require('~/models/resourcesCategory')
const {
  enums: { QUESTION_TYPE_ENUM }
} = require('~/consts/validation')

describe('Question service (integration)', () => {
  let server
  let userIndex = 0

  const createUser = async (overrides = {}) => {
    userIndex += 1
    return await User.create({
      role: ['student'],
      firstName: 'Test',
      lastName: 'User',
      email: `user${userIndex}@example.com`,
      password: 'password1',
      ...overrides
    })
  }

  const createCategory = async (author) => {
    return await ResourcesCategory.create({
      name: 'General',
      author
    })
  }

  const createQuestionData = (category) => ({
    title: 'Sample question',
    text: 'Sample text',
    answers: [{ text: 'Answer 1', isCorrect: true }],
    type: QUESTION_TYPE_ENUM[0],
    category
  })

  beforeAll(async () => {
    ;({ server } = await serverInit())
  })

  afterEach(async () => {
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  it('returns paginated questions with populated category', async () => {
    const user = await createUser()
    const category = await createCategory(user._id)

    await Question.create([
      { ...createQuestionData(category._id), title: 'A question', author: user._id },
      { ...createQuestionData(category._id), title: 'B question', author: user._id },
      { ...createQuestionData(category._id), title: 'C question', author: user._id }
    ])

    const result = await questionService.getQuestions({ author: user._id }, { title: 1 }, 1, 1)

    expect(result.count).toBe(3)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('B question')
    expect(result.items[0].category.name).toBe(category.name)
    expect(result.items[0].category._id.toString()).toBe(category._id.toString())
  })

  it('returns a question by id', async () => {
    const user = await createUser()
    const category = await createCategory(user._id)
    const question = await Question.create({
      ...createQuestionData(category._id),
      author: user._id
    })

    const result = await questionService.getQuestionById(question._id)

    expect(result._id.toString()).toBe(question._id.toString())
    expect(result.title).toBe(question.title)
  })

  it('creates a question with populated category', async () => {
    const user = await createUser()
    const category = await createCategory(user._id)
    const data = createQuestionData(category._id)

    const created = await questionService.createQuestion(user._id, data)

    expect(created.title).toBe(data.title)
    expect(created.category.name).toBe(category.name)
    expect(created.category._id.toString()).toBe(category._id.toString())

    const stored = await Question.findById(created._id).lean()
    expect(stored).toMatchObject({ title: data.title, author: user._id })
  })

  it('updates a question when user is the author', async () => {
    const user = await createUser()
    const category = await createCategory(user._id)
    const question = await Question.create({
      ...createQuestionData(category._id),
      author: user._id
    })

    const updated = await questionService.updateQuestion(question._id, user._id.toString(), {
      title: 'Updated question'
    })

    expect(updated.title).toBe('Updated question')
    expect(updated.category.name).toBe(category.name)
    const stored = await Question.findById(question._id).lean()
    expect(stored.title).toBe('Updated question')
  })

  it('throws forbidden error when updating a question by another user', async () => {
    const user = await createUser()
    const otherUser = await createUser()
    const category = await createCategory(user._id)
    const question = await Question.create({
      ...createQuestionData(category._id),
      author: user._id
    })

    await expect(
      questionService.updateQuestion(question._id, otherUser._id.toString(), { title: 'Hack attempt' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('deletes a question when user is the author', async () => {
    const user = await createUser()
    const category = await createCategory(user._id)
    const question = await Question.create({
      ...createQuestionData(category._id),
      author: user._id
    })

    await questionService.deleteQuestion(question._id, user._id.toString())

    const stored = await Question.findById(question._id).lean()
    expect(stored).toBeNull()
  })

  it('throws forbidden error when deleting a question by another user', async () => {
    const user = await createUser()
    const otherUser = await createUser()
    const category = await createCategory(user._id)
    const question = await Question.create({
      ...createQuestionData(category._id),
      author: user._id
    })

    await expect(questionService.deleteQuestion(question._id, otherUser._id.toString())).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN'
    })
  })
})
