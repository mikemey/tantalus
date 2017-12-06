const expect = require('chai').expect

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
      mongodb: { url: 'mongodb://127.0.0.1:27017/tantalus' }
    }

    it('allows access when NODE_ENV is valid', () => {
      process.env.NODE_ENV = 'PROD'
      return mongoConnection.initializeDirectConnection(prodConfig, console)
        .then(() => mongoConnection.db.should.be.ok)
    })

    it('throws error when NODE_ENV not set', () => {
      expect(() => mongoConnection.initializeAll(prodConfig, console))
        .to.throw(Error, 'Access to production database with invalid NODE_ENV: undefined')
    })

    it('throws error when NODE_ENV set to wrong value', () => {
      process.env.NODE_ENV = 'dev'
      expect(() => mongoConnection.initializeAll(prodConfig, console))
        .to.throw(Error, 'Access to production database with invalid NODE_ENV: dev')
    })
  })
})
