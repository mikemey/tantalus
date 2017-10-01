/* global describe before beforeEach it */

require('chai').should()

const helpers = require('../helpers')
const { Account } = require('../../backend/users/userModel')

describe('Account DAO', function () {
  before(helpers.connectMongoose)
  after(helpers.closeMongoose)

  beforeEach(helpers.dropDatabase)

  const authenticate = (username, password) => new Promise((resolve, reject) => {
    Account.authenticate()(username, password, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })

  const expectFailedAuth = (username, password) => authenticate(username, password)
    .then(result => result.should.equal(false))

  it('find a user by username', () => {
    const testAccount = new Account({ username: '12345' })
    return testAccount.save()
      .then(() => Account.findOne({ username: testAccount.username }))
      .then(account => { account.username.should.equal(testAccount.username) })
  })

  it('stores when registering a user and authenticate afterwards', () => {
    const username = 'registerme'
    const password = 'mypass'
    return Account.register(username, password)
      .then(helpers.getAccounts)
      .then(accounts => {
        accounts.should.have.length(1)
        accounts[0].username.should.equal(username)
      })
      .then(() => authenticate(username, password))
      .then(result => result.username.should.equal(username))
  })

  it('unregistered user cannot authenticate', () => expectFailedAuth('some_name', 'password'))

  it('wrong password should reject user', () => {
    const username = 'registerme'
    return Account.register(username, 'pass')
      .then(() => expectFailedAuth(username, 'wrong_pass'))
  })
})
