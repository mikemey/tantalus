/* global describe before beforeEach it */
const request = require('supertest')

const helpers = require('../helpers')

describe('/api/users/keys endpoint', () => {
  let app, server

  const testUser = {
    username: 'afdafd'
  }

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, true, testUser))

  after(() => helpers.closeAll(server))

  const getKeys = () => request(app).get('/api/users/keys')
  const putKeys = newKeys => request(app)
    .put('/api/users/keys')
    .send(newKeys)

  describe('error responses', () => {
    it('400 when no name', () => putKeys({ credentials: { userID: 'lala' } })
      .expect(400, { error: 'Key name missing' })
    )

    it('400 when no credentials', () => putKeys({ name: 'test' })
      .expect(400, { error: 'Key credentials missing' })
    )

    it('400 when empty credentials', () => putKeys({ name: 'test', credentials: {} })
      .expect(400, { error: 'Key credentials missing' })
    )
  })

  describe('valid data responses', () => {
    beforeEach(() => helpers.dropDatabase()
      .then(() => helpers.insertAccounts([testUser]))
    )

    it('stores and returns key data', () => {
      const testKeys = { name: 'test', credentials: { userID: 'lala' } }
      return putKeys(testKeys)
        .expect(204)
        .then(() => getKeys().expect(200, [testKeys]))
    })

    it('adds key data', () => {
      const testKeys = { name: 'test', credentials: { userID: 'lala' } }
      const secTestKeys = { name: 'second-test', credentials: { apikey: 'blu' } }

      return putKeys(testKeys)
        .then(() => putKeys(secTestKeys).expect(204))
        .then(() => getKeys()
          .expect(200, [testKeys, secTestKeys])
        )
    })

    it('overwrites existing key data', () => {
      const testKeys = { name: 'test', credentials: { userID: 'lala' } }
      const correctTestKeys = { name: 'test', credentials: { apikey: 'blu' } }

      return putKeys(testKeys)
        .then(() => putKeys(correctTestKeys).expect(204))
        .then(() => getKeys().expect(200, [correctTestKeys]))
    })
  })
})
