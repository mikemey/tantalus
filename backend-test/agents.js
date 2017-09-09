const supertest = require('supertest')
const Test = require('supertest/lib/test')
const setCookieParser = require('set-cookie-parser')

const XSRF_HEADER = 'X-XSRF-TOKEN'
const XSRF_COOKIE = 'XSRF-TOKEN'

const extractXSRFValue = res => {
  const token = setCookieParser.parse(res)
    .find(cookie => cookie.name === XSRF_COOKIE).value
  return token
}

const csrfTokenResponseHandler = agent => event => {
  agent.csrfToken = extractXSRFValue(event.res)
}

const csrfGet = agent => function (url, fn) {
  const req = new Test(agent.app, 'GET', url)
  req.ca(agent._ca)
  req.cert(agent._cert)
  req.key(agent._key)

  req.on('response', csrfTokenResponseHandler(agent))
  req.on('response', agent._saveCookies.bind(agent))
  req.on('redirect', agent._saveCookies.bind(agent))
  req.on('redirect', agent._attachCookies.bind(agent, req))
  agent._attachCookies(req)

  return req
}

const csrfPost = agent => url => {
  const req = new Test(agent.app, 'POST', url)
  req.ca(agent._ca)
  req.cert(agent._cert)
  req.key(agent._key)

  req.set(XSRF_HEADER, agent.csrfToken)
  agent.csrfToken = null

  req.on('response', csrfTokenResponseHandler(agent))
  req.on('redirect', agent._saveCookies.bind(agent))
  req.on('redirect', agent._attachCookies.bind(agent, req))
  agent._attachCookies(req)

  return req
}

const setupCSRFAgent = app => new Promise((resolve, reject) => {
  const agent = supertest.agent(app)
  agent.post = csrfPost(agent)
  agent.get = csrfGet(agent)

  return agent.get('/api/version')
    .then(res => { resolve(agent) })
})

module.exports = {
  XSRF_HEADER,
  setupCSRFAgent
}
