const router = require('express').Router()

const quizController = require('~/controllers/quiz')
const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')

const {
  roles: { TUTOR, ADMIN, SUPERADMIN }
} = require('~/consts/auth')

router.use(authMiddleware)
router.use(restrictTo(TUTOR, ADMIN, SUPERADMIN))

router.get('/', asyncWrapper(quizController.getQuizzes))

module.exports = router
