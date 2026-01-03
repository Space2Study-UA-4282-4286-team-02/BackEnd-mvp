const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const { UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, DOCUMENT_NOT_FOUND, INVALID_ID } = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const Category = require('~/models/category')
const Subject = require('~/models/subject')
const mongoose = require('mongoose')
const {
  roles: { STUDENT, ADMIN }
} = require('~/consts/auth')

const endpointUrl = '/categories'

describe('Category controller', () => {
  let app, server, accessToken
  let userIndex = 0

  beforeAll(async () => {
    ;({ app, server } = await serverInit())
  })

  beforeEach(async () => {
    accessToken = await testUserAuthentication(app, { role: STUDENT })
  })

  afterEach(async () => {
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  const seedCategories = async () => {
    const categoryWithSubject = await Category.create({
      name: 'Mathematics',
      appearance: { icon: 'math', color: '#111111' }
    })
    await Category.create({
      name: 'History'
    })
    await Subject.create({
      name: 'Algebra',
      category: categoryWithSubject._id
    })

    return categoryWithSubject
  }

  describe(`GET ${endpointUrl}`, () => {
    it('should return categories with subjects', async () => {
      const categoryWithSubject = await seedCategories()

      const response = await app.get(endpointUrl).set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(1)
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0]._id.toString()).toBe(categoryWithSubject._id.toString())
      expect(response.body.items[0].name).toBe(categoryWithSubject.name)
    })

    it('should throw BAD_REQUEST for invalid query params', async () => {
      const response = await app.get(`${endpointUrl}?limit=not-a-number`).set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, BAD_REQUEST, response)
    })

    it('should throw BAD_REQUEST for zero limit', async () => {
      const response = await app.get(`${endpointUrl}?limit=0`).set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, BAD_REQUEST, response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(endpointUrl)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN', async () => {
      userIndex += 1
      const adminAccessToken = await testUserAuthentication(app, {
        role: ADMIN,
        firstName: 'Admin',
        lastName: `User${userIndex}`,
        email: `admin${userIndex}@example.com`,
        password: 'Password1@',
        appLanguage: 'en',
        isEmailConfirmed: true,
        lastLoginAs: ADMIN
      })

      const response = await app.get(endpointUrl).set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`GET ${endpointUrl}/names`, () => {
    it('should return category names with subjects', async () => {
      const categoryWithSubject = await seedCategories()

      const response = await app.get(`${endpointUrl}/names`).set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]._id.toString()).toBe(categoryWithSubject._id.toString())
      expect(response.body[0].name).toBe(categoryWithSubject.name)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/names`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN', async () => {
      userIndex += 1
      const adminAccessToken = await testUserAuthentication(app, {
        role: ADMIN,
        firstName: 'Admin',
        lastName: `User${userIndex}`,
        email: `admin${userIndex}@example.com`,
        password: 'Password1@',
        appLanguage: 'en',
        isEmailConfirmed: true,
        lastLoginAs: ADMIN
      })

      const response = await app.get(`${endpointUrl}/names`).set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`GET ${endpointUrl}/:id`, () => {
    it('should return category by id', async () => {
      const categoryWithSubject = await seedCategories()

      const response = await app.get(`${endpointUrl}/${categoryWithSubject._id}`).set('Cookie', [
        `accessToken=${accessToken}`
      ])

      expect(response.statusCode).toBe(200)
      expect(response.body._id.toString()).toBe(categoryWithSubject._id.toString())
      expect(response.body.name).toBe(categoryWithSubject.name)
    })

    it('should throw INVALID_ID', async () => {
      const response = await app.get(`${endpointUrl}/not-a-mongo-id`).set('Cookie', [
        `accessToken=${accessToken}`
      ])

      expectError(400, INVALID_ID, response)
    })

    it('should throw DOCUMENT_NOT_FOUND', async () => {
      const nonExistingId = new mongoose.Types.ObjectId()
      const response = await app.get(`${endpointUrl}/${nonExistingId}`).set('Cookie', [
        `accessToken=${accessToken}`
      ])

      expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/1234567890abcdef12345678`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN', async () => {
      userIndex += 1
      const adminAccessToken = await testUserAuthentication(app, {
        role: ADMIN,
        firstName: 'Admin',
        lastName: `User${userIndex}`,
        email: `admin${userIndex}@example.com`,
        password: 'Password1@',
        appLanguage: 'en',
        isEmailConfirmed: true,
        lastLoginAs: ADMIN
      })

      const response = await app.get(`${endpointUrl}/1234567890abcdef12345678`).set('Cookie', [
        `accessToken=${adminAccessToken}`
      ])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`GET ${endpointUrl}/:id/subjects/names`, () => {
    it('should return subject names by category id', async () => {
      const categoryWithSubject = await seedCategories()
      const subject = await Subject.findOne({ category: categoryWithSubject._id }).lean().exec()

      const response = await app
        .get(`${endpointUrl}/${categoryWithSubject._id}/subjects/names`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]._id.toString()).toBe(subject._id.toString())
      expect(response.body[0].name).toBe(subject.name)
    })

    it('should throw INVALID_ID', async () => {
      const response = await app
        .get(`${endpointUrl}/not-a-mongo-id/subjects/names`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, INVALID_ID, response)
    })

    it('should throw BAD_REQUEST when category id is missing', async () => {
      const response = await app.get(`${endpointUrl}/subjects/names`).set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, BAD_REQUEST, response)
    })

    it('should throw DOCUMENT_NOT_FOUND', async () => {
      const nonExistingId = new mongoose.Types.ObjectId()
      const response = await app
        .get(`${endpointUrl}/${nonExistingId}/subjects/names`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/1234567890abcdef12345678/subjects/names`)

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN', async () => {
      userIndex += 1
      const adminAccessToken = await testUserAuthentication(app, {
        role: ADMIN,
        firstName: 'Admin',
        lastName: `User${userIndex}`,
        email: `admin${userIndex}@example.com`,
        password: 'Password1@',
        appLanguage: 'en',
        isEmailConfirmed: true,
        lastLoginAs: ADMIN
      })

      const response = await app
        .get(`${endpointUrl}/1234567890abcdef12345678/subjects/names`)
        .set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
