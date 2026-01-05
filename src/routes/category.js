const router = require('express').Router()
const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const isEntityValid = require('~/middlewares/entityValidation')
const categoryController = require('~/controllers/category')
const categoryValidation = require('~/validation/schemas/category')
const {
  roles: { ADMIN }
} = require('~/consts/auth')

router.post(
  '/',
  authMiddleware,
  restrictTo(ADMIN),
  isEntityValid({ body: categoryValidation }),
  asyncWrapper(categoryController.createCategory)
)

module.exports = router
