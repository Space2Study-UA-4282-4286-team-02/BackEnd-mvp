const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const { UNAUTHORIZED, FORBIDDEN } = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const TokenService = require('~/services/token')
const ResourcesCategory = require('~/models/resourcesCategory')
const Lesson = require('~/models/lesson')
const mongoose = require('mongoose')
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

  describe(`GET ${endpointUrl}`, () => {
    it('should return lessons for current user', async () => {
      await Lesson.create([
        {
          ...lessonData,
          author: currentUser.id,
          category: category._id
        },
        {
          ...lessonData,
          title: 'Second lesson',
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

  describe(`PATCH ${endpointUrl}/:id`, () => {
    it('should update lesson for author', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${lesson._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.title).toBe('Updated title')
    })

    it('should return 404 for missing lesson', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .patch(`${endpointUrl}/${missingId}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should return validation error for invalid update data', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${lesson._id}`)
        .send({ title: '' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(409)
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('should throw UNAUTHORIZED', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app.patch(`${endpointUrl}/${lesson._id}`).send({ title: 'Updated title' })

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${lesson._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw FORBIDDEN for non-owner tutor', async () => {
      const otherTutorToken = await testUserAuthentication(app, {
        role: TUTOR,
        email: 'other-tutor@example.com'
      })

      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .patch(`${endpointUrl}/${lesson._id}`)
        .send({ title: 'Updated title' })
        .set('Cookie', [`accessToken=${otherTutorToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`DELETE ${endpointUrl}/:id`, () => {
    it('should delete lesson for author', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${lesson._id}`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(204)

      const stored = await Lesson.findById(lesson._id).lean()
      expect(stored).toBeNull()
    })

    it('should return 404 for missing lesson', async () => {
      const missingId = new mongoose.Types.ObjectId()

      const response = await app
        .delete(`${endpointUrl}/${missingId}`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(404)
      expect(response.body.code).toBe('DOCUMENT_NOT_FOUND')
    })

    it('should throw UNAUTHORIZED', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app.delete(`${endpointUrl}/${lesson._id}`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN for student role', async () => {
      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${lesson._id}`)
        .set('Cookie', [`accessToken=${studentAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })

    it('should throw FORBIDDEN for non-owner tutor', async () => {
      const otherTutorToken = await testUserAuthentication(app, {
        role: TUTOR,
        email: 'delete-other-tutor@example.com'
      })

      const lesson = await Lesson.create({
        ...lessonData,
        author: currentUser.id,
        category: category._id
      })

      const response = await app
        .delete(`${endpointUrl}/${lesson._id}`)
        .set('Cookie', [`accessToken=${otherTutorToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
