const rp = require('request-promise')
const cheerio = require('cheerio')

const errorHandler = extension =>
  err => console.log(`RESPONSE${extension} error: ` + err.message)

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
      errorHandler('_0')(err)
      return pauseMs(100)
        .then(request)
        .catch(errorHandler('_1'))
    })
}

const get = url => retryRequest(() => rp(transformOpts(url)))

const getJson = url => retryRequest(() => rp(jsonOpts(url)))

module.exports = {
  get,
  getJson
}
