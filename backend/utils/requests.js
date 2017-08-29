const rp = require('request-promise')
const cheerio = require('cheerio')

const transform = body => cheerio.load(body)

const getMethod = { method: 'GET' }

const get = url => {
  const options = Object.assign(
    { uri: url },
    getMethod,
    { transform }
  )
  return rp(options)
    .catch(err => {
      console.error(err)
    })
}

module.exports = {
  get
}
