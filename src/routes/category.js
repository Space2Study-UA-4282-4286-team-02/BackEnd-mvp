const router = require('express').Router()

const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const categoryController = require('~/controllers/category')
const {
  roles: { STUDENT, TUTOR }
} = require('~/consts/auth')

router.use(authMiddleware)
router.use(restrictTo(STUDENT, TUTOR))

router.get('/', asyncWrapper(categoryController.getCategories))
router.get('/names', asyncWrapper(categoryController.getCategoriesNames))

module.exports = router
