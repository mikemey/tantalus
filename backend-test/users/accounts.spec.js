const request = require('supertest')

const helpers = require('../../utils-test/helpers')

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

  beforeEach(() => helpers.dropDatabase()
    .then(() => helpers.insertAccounts([testUser]))
  )

  it('returns account data', () => getAccount()
    .expect(200, {
      username: testUser.username
    })
  )
})
