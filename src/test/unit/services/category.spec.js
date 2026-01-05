const createCategoryService = require('~/services/category')
const CategoryModel = require('~/models/category')

jest.mock('~/models/category')

describe('services/category.createCategory (unit)', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('should save category and return object on success', async () => {
    const fakeSaved = { _id: '1', name: 'Unit', slug: 'unit' }

    CategoryModel.mockImplementation(function (data) {
      this.data = data
      this.save = jest.fn().mockResolvedValue({
        ...fakeSaved,
        toObject: () => ({ _id: fakeSaved._id, name: fakeSaved.name, slug: fakeSaved.slug })
      })
    })

    const result = await createCategoryService.createCategory({ name: 'Unit', slug: 'unit' })
    expect(result).toEqual({ _id: '1', name: 'Unit', slug: 'unit' })
  })

  test('should throw normalized error on duplicate (11000)', async () => {
    const mongoErr = new Error('E11000 duplicate key error')
    mongoErr.code = 11000
    mongoErr.keyValue = { slug: 'dup' }

    CategoryModel.mockImplementation(function (data) {
      this.save = jest.fn().mockRejectedValue(mongoErr)
    })

    await expect(createCategoryService.createCategory({ name: 'Dup', slug: 'dup' }))
      .rejects.toMatchObject({ code: 11000, status: 409 })
  })
})
