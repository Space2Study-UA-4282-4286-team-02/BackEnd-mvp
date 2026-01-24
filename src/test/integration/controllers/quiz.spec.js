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

describe('Quiz controller', () => {
  let app, server, accessToken, studentAccessToken, currentUser, category

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

  beforeAll(async () => {
    ;({ app, server } = await serverInit())
  })

  beforeEach(async () => {
    accessToken = await testUserAuthentication(app, { role: TUTOR })
    studentAccessToken = await testUserAuthentication(app, { role: 'student' })

    currentUser = TokenService.validateAccessToken(accessToken)

    category = await ResourcesCategory.create({
      name: 'Math',
      author: currentUser.id
    })
  })

  afterEach(async () => {
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  describe(`GET ${endpointUrl}`, () => {
    it('should return quizzes for current user', async () => {
      await Quiz.create([
        {
          ...quizData,
          author: currentUser.id,
          category: category._id
        },
        {
          ...quizData,
          title: 'Second quiz',
          author: currentUser.id,
          category: category._id
        }
      ])

      const response = await app
        .get(endpointUrl)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(2)
      expect(response.body.items).toHaveLength(2)
      expect(response.body.items[0]).toMatchObject({
        title: expect.any(String),
        author: currentUser.id
      })
    })

    it('should return 400 for invalid query params', async () => {
      const response = await app
        .get(`${endpointUrl}?limit=0`)
        .set('Cookie', [`accessToken=${accessToken}`])

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
      const question = await Question.create({
        ...questionData,
        author: currentUser.id,
        category: category._id
      })
      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
        category: category._id,
        items: [question._id]
      })

      const response = await app
        .get(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body).toMatchObject({
        _id: quiz._id.toString(),
        title: quiz.title,
        author: currentUser.id
      })
      expect(response.body.items).toHaveLength(1)
    })

    it('should return 404 for missing quiz', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .get(`${endpointUrl}/${missingId}`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should return 400 for invalid id', async () => {
      const response = await app
        .get(`${endpointUrl}/invalid-id`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(400)
      expect(response.body.code).toBe('INVALID_ID')
    })

    it('should return 403 for non-owner tutor', async () => {
      const otherAccessToken = await testUserAuthentication(app, { role: TUTOR })
      const otherUser = TokenService.validateAccessToken(otherAccessToken)
      const quiz = await Quiz.create({
        ...quizData,
        author: otherUser.id,
        category: category._id
      })

      const response = await app
        .get(`${endpointUrl}/${quiz._id}`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/${new mongoose.Types.ObjectId()}`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
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
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.title).toBe('Updated title')
    })

    it('should return 404 for missing quiz', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .patch(`${endpointUrl}/${missingId}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should return validation error for invalid update data', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: '' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(409)
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('should throw UNAUTHORIZED', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app.patch(`${endpointUrl}/${quiz._id}`).send({ title: 'Updated title' })

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw FORBIDDEN for non-owner tutor', async () => {
      const otherTutorToken = await testUserAuthentication(app, {
        role: TUTOR,
        email: 'other-tutor@example.com'
      })

      const quiz = await Quiz.create({
        ...quizData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${quiz._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${otherTutorToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
