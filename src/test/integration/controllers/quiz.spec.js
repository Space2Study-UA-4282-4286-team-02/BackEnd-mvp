const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const testUserAuthentication = require('~/utils/testUserAuth')
const TokenService = require('~/services/token')
const ResourcesCategory = require('~/models/resourcesCategory')
const Question = require('~/models/question')
const Quiz = require('~/models/quiz')
const {
  roles: { TUTOR }
} = require('~/consts/auth')
const { UNAUTHORIZED, FORBIDDEN } = require('~/consts/errors')

const endpointUrl = '/quizzes'

const createUserData = (role, suffix) => ({
  role,
  firstName: `${role}-user`,
  lastName: 'Tester',
  email: `${role}.${suffix}@example.com`,
  password: 'Password123@',
  FAQ: {
    [role]: [{ question: 'question', answer: 'answer' }]
  },
  isEmailConfirmed: true,
  lastLoginAs: role
})

describe('Quiz controller', () => {
  let app,
    server,
    tutorAccessToken,
    studentAccessToken,
    currentTutor,
    category,
    question,
    tutorUserData

  beforeAll(async () => {
    ;({ app, server } = await serverInit())
  })

  beforeEach(async () => {
    const uniqueSuffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`

    const tutorData = createUserData(TUTOR, `creator-${uniqueSuffix}`)
    const studentData = createUserData('student', `learner-${uniqueSuffix}`)

    tutorUserData = tutorData

    tutorAccessToken = await testUserAuthentication(app, tutorData)
    studentAccessToken = await testUserAuthentication(app, studentData)

    currentTutor = TokenService.validateAccessToken(tutorAccessToken)

    category = await ResourcesCategory.create({
      name: 'Mathematics',
      author: currentTutor.id
    })

    question = await Question.create({
      title: 'What is 2 + 2?',
      text: 'Select the correct answer',
      answers: [
        { text: '4', isCorrect: true },
        { text: '3', isCorrect: false }
      ],
      type: 'multipleChoice',
      category: category._id,
      author: currentTutor.id
    })
  })

  afterEach(async () => {
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  describe(`POST ${endpointUrl}`, () => {
    it('should create a quiz', async () => {
      const payload = {
        title: 'Math Quiz',
        description: 'Test your math knowledge',
        items: [question._id],
        category: category._id,
        resourceType: 'quizzes',
        settings: {
          showCorrectAnswers: true,
          shuffleQuestions: false,
          quizView: 'Scroll'
        }
      }

      const response = await app
        .post(endpointUrl)
        .send(payload)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(201)
      expect(response.body).toMatchObject({
        title: payload.title,
        description: payload.description,
        resourceType: payload.resourceType,
        category: {
          _id: category._id.toString(),
          name: category.name
        },
        items: [
          expect.objectContaining({
            _id: question._id.toString(),
            title: question.title,
            text: question.text,
            type: question.type
          })
        ],
        settings: expect.objectContaining(payload.settings)
      })

      expect(response.body.author).toMatchObject({
        _id: currentTutor.id,
        firstName: tutorUserData.firstName,
        lastName: tutorUserData.lastName,
        email: tutorUserData.email
      })

      const stored = await Quiz.findById(response.body._id).lean()

      expect(stored).toBeTruthy()
      expect(stored.title).toBe(payload.title)
      expect(stored.author.toString()).toBe(currentTutor.id)
      expect(stored.items.map(String)).toContain(question._id.toString())
    })

    it('should return 409 for invalid payload', async () => {
      const response = await app
        .post(endpointUrl)
        .send({
          description: 'Missing required title and items',
          items: [],
          resourceType: 'quizzes'
        })
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(409)
      expect(response.body).toMatchObject({
        status: 409,
        code: 'VALIDATION_ERROR'
      })
      expect(response.body.message).toContain('items')
    })

    it('should throw UNAUTHORIZED when no token provided', async () => {
      const response = await app.post(endpointUrl).send({})

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const response = await app
        .post(endpointUrl)
        .send({
          title: 'Attempted Quiz',
          description: 'Students cannot create quizzes',
          items: [question._id],
          category: category._id,
          resourceType: 'quizzes'
        })
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
