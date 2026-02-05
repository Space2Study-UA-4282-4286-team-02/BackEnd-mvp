const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const { UNAUTHORIZED, FORBIDDEN } = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const TokenService = require('~/services/token')
const ResourcesCategory = require('~/models/resourcesCategory')
const Question = require('~/models/question')
const Quiz = require('~/models/quiz')
const mongoose = require('mongoose')
const {
  roles: { TUTOR }
} = require('~/consts/auth')

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

const quizData = {
  title: 'Intro to Algebra Quiz',
  description: 'Check your understanding of algebraic expressions.',
  items: []
}

const questionData = {
  title: 'Linear equations basics',
  text: 'Solve: 2x + 3 = 11',
  answers: [{ text: 'x = 4', isCorrect: true }],
  type: 'oneAnswer'
}

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
      title: questionData.title || 'What is 2 + 2?',
      text: questionData.text || 'Select the correct answer',
      answers:
        questionData.answers || [
          { text: '4', isCorrect: true },
          { text: '3', isCorrect: false }
        ],
      type: questionData.type || 'multipleChoice',
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

  describe(`GET ${endpointUrl}`, () => {
    it('should return quizzes for current tutor', async () => {
      await Quiz.create([
        {
          ...quizData,
          author: currentTutor.id,
          category: category._id
        },
        {
          ...quizData,
          title: 'Second quiz',
          author: currentTutor.id,
          category: category._id
        }
      ])

      const response = await app
        .get(endpointUrl)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(2)
      expect(response.body.items).toHaveLength(2)
      expect(response.body.items[0]).toMatchObject({
        title: expect.any(String),
        author: currentTutor.id
      })
    })

    it('should return 400 for invalid query params', async () => {
      const response = await app
        .get(`${endpointUrl}?limit=0`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(400)
      expect(response.body.code).toBe('BAD_REQUEST')
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(endpointUrl)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const response = await app
        .get(endpointUrl)
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`GET ${endpointUrl}/:id`, () => {
    it('should return quiz by id', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id,
        items: [question._id]
      })

      const response = await app
        .get(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        _id: quiz._id.toString(),
        title: quiz.title,
        author: currentTutor.id
      })
      expect(response.body.items).toHaveLength(1)
    })

    it('should return 404 for missing quiz', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .get(`${endpointUrl}/${missingId}`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should return 400 for invalid id', async () => {
      const response = await app
        .get(`${endpointUrl}/invalid-id`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(400)
      expect(response.body.code).toBe('INVALID_ID')
    })

    it('should return 403 for non-owner tutor', async () => {
      const otherAccessToken = await testUserAuthentication(app, createUserData(TUTOR, 'other'))
      const otherUser = TokenService.validateAccessToken(otherAccessToken)
      const quiz = await Quiz.create({
        ...quizData,
        author: otherUser.id,
        category: category._id
      })

      const response = await app
        .get(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/${new mongoose.Types.ObjectId()}`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .get(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`PATCH ${endpointUrl}/:id`, () => {
    it('should update quiz for author', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.title).toBe('Updated title')
    })

    it('should return 404 for missing quiz', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .patch(`${endpointUrl}/${missingId}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should return validation error for invalid update data', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: '' })
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(409)
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('should throw UNAUTHORIZED', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app.patch(`${endpointUrl}/${quiz._id}`).send({ title: 'Updated title' })

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw FORBIDDEN for non-owner tutor', async () => {
      const otherTutorToken = await testUserAuthentication(app, createUserData(TUTOR, 'other-tutor'))

      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${otherTutorToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`DELETE ${endpointUrl}/:id`, () => {
    it('should delete quiz for author', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(204)

      const stored = await Quiz.findById(quiz._id).lean()
      expect(stored).toBeNull()
    })

    it('should return 404 for missing quiz', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .delete(`${endpointUrl}/${missingId}`)
        .set('Cookie', [`accessToken=${tutorAccessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should throw UNAUTHORIZED', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app.delete(`${endpointUrl}/${quiz._id}`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw FORBIDDEN for non-owner tutor', async () => {
      const otherTutorToken = await testUserAuthentication(app, createUserData(TUTOR, 'other-tutor'))

      const quiz = await Quiz.create({
        ...quizData,
        author: currentTutor.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${otherTutorToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
