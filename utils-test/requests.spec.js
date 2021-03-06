const nock = require('nock')

const requests = require('../utils/requests')
const RequestError = requests.RequestError

describe('requests module', () => {
  afterEach(() => nock.cleanAll())

  const host = 'http://example'
  const page = '/index'
  const indexUrl = host + page
  const nockIndex = () => nock(host).get(page)
  const nockPost = body => nock(host).post(page, body)

  describe('get', () => {
    const content = 'lalal'
    const workingResponse = `<html>${content}</html>`
    it('use first response when 200 response', () => {
      nockIndex()
        .reply(200, workingResponse)
      return requests.getHtml(indexUrl)
        .then($ => $.text().should.equal(content))
    })

    it('should retry when one 429 response', () => {
      nockIndex()
        .reply(429, 'retry get later')
        .get('/index')
        .reply(200, workingResponse)
      return requests.getHtml(indexUrl)
        .then($ => $.text().should.equal(content))
    })

    it('should throw exception when two 429 responses', () => {
      nockIndex().twice()
        .reply(429, 'retry getJson later')
      return requests.getHtml(indexUrl)
        .catch(err => {
          err.name.should.equal(RequestError.name)
          err.message.should.contain(indexUrl)
        })
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

    it('should throw exception when two 429 responses', () => {
      nockIndex().twice()
        .reply(429, 'retry getJson later')
      return requests.getJson(indexUrl)
        .catch(err => {
          err.name.should.equal(RequestError.name)
          err.message.should.contain(indexUrl)
        })
    })
  })

  describe('postJson', () => {
    const postBody = { my: 'name' }
    const workingResponse = { hello: 'world' }

    it('use response when 200 response', () => {
      nockPost(postBody).reply(200, workingResponse)
      return requests.postJson(indexUrl, postBody)
        .then(body => body.should.deep.equal(workingResponse))
    })

    it('use boolean response when 200 response', () => {
      const boolResponse = true
      nockPost(postBody).reply(200, `${boolResponse}`)
      return requests.postJson(indexUrl, postBody)
        .then(body => body.should.equal(boolResponse))
    })

    it('should add statusCode + body to error when re-request disabled and 409 response', () => {
      const errorResponse = { message: 'error message' }
      nockPost(postBody).reply(409, errorResponse)
      return requests.postJson(indexUrl, postBody, false)
        .catch(err => {
          err.name.should.equal(RequestError.name)
          err.message.should.contain(indexUrl)
          err.statusCode.should.equal(409)
          err.body.should.deep.equal(errorResponse)
        })
    })
  })
})
