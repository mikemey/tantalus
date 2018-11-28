const should = require('chai').should()

const mongoConnection = require('../utils/mongoConnection')

describe('mongo connection', () => {
  describe('production DB access checks', () => {
    let originalEnv

    beforeEach(() => {
      originalEnv = process.env
      process.env = {}
    })
    afterEach(() => {
      process.env = originalEnv
    })

    const prodConfig = {
      mongodb: {
        url: 'mongodb://127.0.0.1:27017',
        dbName: 'tantalus'
      }
    }

    it('allows access when NODE_ENV is valid', () => {
      process.env.NODE_ENV = 'PROD'
      return mongoConnection.connect(prodConfig, console)
        .then(() => should.exist(mongoConnection.db))
        .then(() => mongoConnection.close())
    })

    it('throws error when NODE_ENV not set', () => {
      return mongoConnection.connect(prodConfig, console)
        .then(() => should.fail('expected exception not thrown!'))
        .catch(err =>
          err.message.should.equal('Access to production database with invalid NODE_ENV: undefined')
        )
    })

    it('throws error when NODE_ENV set to wrong value', () => {
      process.env.NODE_ENV = 'dev'
      return mongoConnection.connect(prodConfig, console)
        .then(() => should.fail('expected exception not thrown!'))
        .catch(err =>
          err.message.should.equal('Access to production database with invalid NODE_ENV: dev')
        )
    })
  })
})
