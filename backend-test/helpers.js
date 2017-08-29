
const createServer = require('../backend/app')

const startTestServer = callback => {
  return createServer(console).then(({app, server}) => {
    callback(app, server)
  })
}

const close = (server, done) => {
  if (server) {
    server.close(done)
  }
}
module.exports = {
  startTestServer,
  close
}
