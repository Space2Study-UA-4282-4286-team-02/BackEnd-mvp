const User = require('~/models/user')
const passwordService = require('~/services/password.service')

const testUserAuthentication = async (app, testUser = {}) => {
  const qtyOfMandatorySignupFields = 5
  if (Object.keys(testUser).length < qtyOfMandatorySignupFields) {
    testUser = {
      role: testUser.role ? testUser.role : 'student',
      firstName: 'Tart',
      lastName: 'Drilling',
      email: 'tartdrilling@gmail.com',
      password: 'Qwerty123@',
      FAQ: { student: [{ question: 'question1', answer: 'answer1' }] },
      isEmailConfirmed: true,
      lastLoginAs: testUser.role ? testUser.role : 'student'
    }
  }

  const plainPassword = testUser.password
  const hashedPassword = await passwordService.hashPassword(plainPassword)

  await User.create({ ...testUser, password: hashedPassword })

  const loginUserResponse = await app.post('/auth/login').send({ email: testUser.email, password: plainPassword })

  return loginUserResponse.body.accessToken
}

module.exports = testUserAuthentication
