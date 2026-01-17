const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const { UNAUTHORIZED, FORBIDDEN } = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const TokenService = require('~/services/token')
const ResourcesCategory = require('~/models/resourcesCategory')
const Lesson = require('~/models/lesson')
const {
  roles: { TUTOR }
} = require('~/consts/auth')

const endpointUrl = '/lessons'

describe('Lesson controller', () => {
  let app, server, accessToken, studentAccessToken, currentUser, category

  const lessonData = {
    title: 'Intro to Algebra',
    description: 'Learn the basics of algebraic expressions.',
    content: '<p>Lesson content</p>',
    attachments: []
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

  describe(`POST ${endpointUrl}`, () => {
    it('should create a lesson', async () => {
      const response = await app
        .post(endpointUrl)
        .send({ ...lessonData, category: category._id })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(201)
      expect(response.body).toMatchObject({
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        author: currentUser.id
      })
      expect(response.body.category).toMatchObject({
        _id: category._id.toString(),
        name: category.name
      })

      const stored = await Lesson.findById(response.body._id).lean()
      expect(stored).toMatchObject({
        title: lessonData.title,
        description: lessonData.description,
        content: lessonData.content,
        author: currentUser.id
      })
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.post(endpointUrl).send(lessonData)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const response = await app
        .post(endpointUrl)
        .send(lessonData)
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should return validation error for invalid data', async () => {
      const response = await app
        .post(endpointUrl)
        .send({ description: 'Missing title' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(409)
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })
  })
})
