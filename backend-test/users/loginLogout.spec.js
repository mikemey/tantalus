/* global describe before beforeEach it */
require('chai').should()

const helpers = require('../helpers')
const { setupCSRFAgent } = require('../agents')

describe('/api/users/login endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, false))

  after(() => helpers.closeAll(server))

  const testUsername = 'new_user'
  const testPassword = 'ladida'

  const loginPost = (username = testUsername, password = testPassword) => csrfAgent
    .post('/api/users/login')
    .send({ username, password })

  let csrfAgent
  const testAccounts = [{
    username: testUsername,
    salt: '0dd3e47e18ddf0544545498340c21ccac725b5c647409123c9a9094d84d1e971',
    hash: '25347868720d4c21b8692d577fdf842e77831d23bb151bc761592810347a30311b42de1bce4e133edab4af20ee2a94ef80424b89a32b8143ee4eeb2cadf879a65f9f7e61df3c3aa1a458d005de5ebd11efaa31ac5a43fe9f1aa1b07672b80d6a7cd6ae86ddb042c99dea7694bcf3bfa2f612beb3fabe626b08c596d6d802611a4a279b38ce3049460463fc0524e37156b4fad46aba86b8f14a80ad19c8349852bdecc9c919b2690162865d08120efc621e57db8256fe4c7d9c0cc06c5cc4c6cd8bfb02f61788eb31b2262d39713f7cb6a4abcbee082b02c6b94fcfed7d0a0edfed081906b28494a615201480fdc4056f97dee614f0171f98962a3d26087c58281c7bd585831584a61ffced52ce0ffb1a7d3c088a185bd495c32bc8b4c2d5566414db8d8aab130a8b239a81e5b79799de3caca6a5218b8948fae350493bbf9fb992475ff88e623524c2648859ce374202cfebf3a4a452a4280cce7ec6d8645a74288cf31277524aba93302863b24ce8b27695b9c2e556c4f9ac6fb546d8dc44cec41fbb282b863e9625dd99c1c5f285a7a20805859d462152c2a8b6c6d1e35e6e3074b15aac5cbe96f0e544bccb5cbfd51a68a6c019fdc639428c3a272d3b1fc58a6f6c47753b27deae0e72fc537cf29ae8805a8b23712a2972810cd5ffa3eb220d59a4a987abd29c9a3c293764dd77632d54f624f601e68606babd5fc17246c4'
  }]

  beforeEach(() => helpers.dropDatabase()
    .then(() => setupCSRFAgent(app))
    .then(agent => { csrfAgent = agent })
    .then(() => helpers.insertAccounts(testAccounts))
  )

  describe('user login', () => {
    it('creates login and allows account retrieval', () => loginPost()
      .expect(204)
      .then(() => csrfAgent.get('/api/users/account')
        .expect(200, { username: testUsername })
      )
    )

    it('response with 401 when invalid password', () => loginPost(testUsername, 'wrong pass')
      .expect(401, { error: 'Login failed' })
    )

    it('response with 401 when unknown user', () => loginPost('unknownuser')
      .expect(401, { error: 'Login failed' })
    )
  })

  describe('user logout', () => {
    it('is invalidating session', () => loginPost()
      .then(() => csrfAgent.post('/api/users/logout').send().expect(204))
      .then(() => csrfAgent.get('/api/users/account').expect(401, { error: 'Authorization required' }))
    )
  })
})
