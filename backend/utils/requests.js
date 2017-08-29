const rp = require('request-promise')
const cheerio = require('cheerio')

const errorHandler = err => console.log(err)

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

const get = url => rp(transformOpts(url)).catch(errorHandler)

const getJson = url => rp(jsonOpts(url)).catch(errorHandler)

module.exports = {
  get,
  getJson
}
