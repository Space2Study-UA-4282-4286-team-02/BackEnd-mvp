const router = require('express').Router()

const auth = require('~/routes/auth')
const user = require('~/routes/user')
const email = require('~/routes/email')
const adminInvitation = require('~/routes/adminInvitation')
const question = require('~/routes/question')
const category = require('~/routes/category')
const resourcesCategory = require('~/routes/resourcesCategory')
const offer = require('~/routes/offer')

router.use('/auth', auth)
router.use('/users', user)
router.use('/send-email', email)
router.use('/admin-invitations', adminInvitation)
router.use('/questions', question)
router.use('/categories', category)
router.use('/resources-categories', resourcesCategory)
router.use('/offers', offer)

module.exports = router
