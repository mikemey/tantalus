const rp = require('request-promise')
const cheerio = require('cheerio')

class RequestError {
  constructor(message) {
    this.name = this.constructor.name
    this.message = message
  }
}

const errorHandler = extension =>
  err => {
    const request = err.options
      ? `${err.options.method} ${err.options.uri}`
      : ''
    const message = `response error ${extension}: ${err.message} [${request}]`
    throw new RequestError(message)
  }

const transform = body => cheerio.load(body)
const methodOpt = verb => {
  return { method: verb }
}

const transformOpts = (url, method = methodOpt('GET')) => Object.assign(
  { uri: url },
  method,
  { transform }
)

const jsonOpts = (url, method = methodOpt('GET')) => Object.assign(
  { uri: url },
  method,
  { json: true }
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

module.exports = {
  getHtml,
  getJson,
  RequestError
}
