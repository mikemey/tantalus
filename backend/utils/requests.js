const rp = require('request-promise')
const cheerio = require('cheerio')

const errorHandler = extension =>
  err => {
    const request = err.options
      ? `${err.options.method} ${err.options.uri}`
      : ''
    console.log('response error %s: %s [%s]', extension, err.message, request)
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
    .catch(err => {
      errorHandler('0')(err)
      return pauseMs(100)
        .then(request)
        .catch(errorHandler('1'))
    })
}

const getHtml = url => retryRequest(() => rp(transformOpts(url)))

const getJson = url => retryRequest(() => rp(jsonOpts(url)))

module.exports = {
  getHtml,
  getJson
}
