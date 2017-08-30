/* global describe before beforeEach it */
const requests = require('../../backend/utils/requests')
const nock = require('nock')
require('chai').should()

describe('requests module', () => {
  afterEach(() => nock.cleanAll())

  const host = 'http://example'
  const page = '/index'
  const indexUrl = host + page
  const nockIndex = () => nock(host).get(page)

  describe('get', () => {
    const content = 'lalal'
    const workingResponse = `<html>${content}</html>`
    it('use first response when 200 response', () => {
      nockIndex()
        .reply(200, workingResponse)
      return requests.get(indexUrl)
        .then($ => $.text().should.equal(content))
    })

    it('should retry when one 429 response', () => {
      nockIndex()
        .reply(429, 'retry get later')
        .get('/index')
        .reply(200, workingResponse)
      return requests.get(indexUrl)
        .then($ => $.text().should.equal(content))
    })
  })

  describe('getJson', () => {
    const workingResponse = { hello: 'world' }
    it('use first response when 200 response', () => {
      nockIndex()
        .reply(200, workingResponse)
      return requests.getJson(indexUrl)
        .then(body => body.should.deep.equal(workingResponse))
    })

    it('should retry when one 429 response', () => {
      nockIndex()
        .reply(429, 'retry getJson later')
        .get('/index')
        .reply(200, workingResponse)
      return requests.getJson(indexUrl)
        .then(body => body.should.deep.equal(workingResponse))
    })
  })
})
