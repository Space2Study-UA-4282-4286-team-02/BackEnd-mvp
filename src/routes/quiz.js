const router = require('express').Router()

const Quiz = require('~/models/quiz')
const Question = require('~/models/question')
const ResourcesCategory = require('~/models/resourcesCategory')
const quizController = require('~/controllers/quiz')
const asyncWrapper = require('~/middlewares/asyncWrapper')
const isEntityValid = require('~/middlewares/entityValidation')
const idValidation = require('~/middlewares/idValidation')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')

const {
  roles: { TUTOR, ADMIN, SUPERADMIN }
} = require('~/consts/auth')

router.use(authMiddleware)
router.use(restrictTo(TUTOR, ADMIN, SUPERADMIN))

router.param('id', idValidation)
const params = [{ model: Quiz, idName: 'id' }]
const body = [
  { model: ResourcesCategory, idName: 'category' },
  { model: Question, idName: 'items' }
]

router.get('/', asyncWrapper(quizController.getQuizzes))
router.get('/:id', isEntityValid({ params }), asyncWrapper(quizController.getQuizById))
router.patch('/:id', isEntityValid({ body }), asyncWrapper(quizController.updateQuiz))

module.exports = router
