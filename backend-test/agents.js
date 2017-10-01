const supertest = require('supertest')

const setupCSRFAgent = app => new Promise((resolve, reject) => {
  const agent = supertest.agent(app)
  return agent.get('/api/version')
    .then(res => resolve(agent))
})

module.exports = {
  setupCSRFAgent
}
