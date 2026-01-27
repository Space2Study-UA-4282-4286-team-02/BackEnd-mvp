const router = require('express').Router()

const quizController = require('~/controllers/quiz')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')  
const asyncWrapper = require('~/middlewares/asyncWrapper')

const {roles: { TUTOR, ADMIN }} = require('~/consts/auth')


router.use(authMiddleware)
router.use(restrictTo(TUTOR, ADMIN))
router.post('/',asyncWrapper(quizController.createQuiz))

module.exports = router
