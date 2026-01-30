const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const { UNAUTHORIZED, FORBIDDEN } = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const TokenService = require('~/services/token')
const ResourcesCategory = require('~/models/resourcesCategory')
const Quiz = require('~/models/quiz')
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
})
