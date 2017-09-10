/* global describe before beforeEach it */
const request = require('supertest')
require('chai').should()

const helpers = require('../helpers')

describe('/api/users/account endpoint', () => {
  let app, server

  const testUser = {
    username: 'afdafd',
    salt: '1234',
    hash: '21342'
  }

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, true, testUser))

  after(() => helpers.closeAll(server))

  const getAccount = () => request(app).get('/api/users/account')

  const testAccounts = [testUser]

  beforeEach(helpers.dropDatabase)
  beforeEach(() => helpers.insertAccounts(testAccounts))

  it('returns account data', () => getAccount()
    .expect(200, { username: testAccounts[0].username })
  )
})
