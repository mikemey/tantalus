/* global describe before beforeEach it */
const request = require('supertest')
require('chai').should()
const cheerio = require('cheerio')

const helpers = require('./helpers')

describe('Start page', () => {
  let app, server

  const get = path => request(app).get(path)
    .then(({ text }) => cheerio.load(text))

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(done => helpers.close(server, done))

  it('serves index.html on /tantalus', () => get('/tantalus/')
    .then($ => $('title').text().should.equal('Tantalus'))
  )

  it('serves index.html on /tantalus/index.html', () => get('/tantalus/index.html')
    .then($ => $('title').text().should.equal('Tantalus'))
  )
})
