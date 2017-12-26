const rp = require('request-promise')
const cheerio = require('cheerio')

class RequestError {
  // eslint-disable-next-line space-before-function-paren
  constructor(message, cause, statusCode, body) {
    this.name = this.constructor.name
    this.message = message
    this.cause = cause
    this.statusCode = statusCode
    this.body = body
  }
}

const errorHandler = (extension = '') => err => {
  const errorMessage = err.options
    ? `${err.options.method} ${err.options.uri} :: ${err.message}`
    : err.message
  const message = `Request error ${extension}: [${errorMessage}]`
  const body = err.response !== undefined ? err.response.body : '[undefined]'
  throw new RequestError(message, err, err.statusCode, body)
}

const transform = body => cheerio.load(body)

const transformOpts = (url, method = 'GET') => Object.assign(
  { uri: url },
  { method },
  { transform }
)

const jsonOpts = (url, method = 'GET', body = null) => Object.assign(
  { uri: url },
  { method },
  body && { body },
  { json: true },
  { headers: { 'User-Agent': 'nope' } }
)

const pauseMs = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))

const retryRequest = request => {
  return request()
    .catch(errorHandler('0'))
    .catch(() => pauseMs(100)
      .then(request)
      .catch(errorHandler('1'))
    )
}

const getHtml = url => retryRequest(() => rp(transformOpts(url)))

const getJson = url => retryRequest(() => rp(jsonOpts(url)))

const postJson = (url, body, rerequest = true) => rerequest
  ? retryRequest(() => rp(jsonOpts(url, 'POST', body)))
  : rp(jsonOpts(url, 'POST', body))
    .catch(errorHandler())

module.exports = {
  getHtml,
  getJson,
  postJson,
  RequestError
}
