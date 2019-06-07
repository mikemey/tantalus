const request = require('supertest')
const cheerio = require('cheerio')
const moment = require('moment')
const should = require('chai').should()

const helpers = require('../utils-test/helpers')

describe('Start page', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(() => helpers.closeAll(server))

  beforeEach(helpers.dropDatabase)

  const getHtml = path => request(app).get(path)
    .then(({ text }) => cheerio.load(text))

  it('serves index.html on /tantalus', () => getHtml('/tantalus/')
    .then($ => $('title').text().should.equal('Tantalus'))
  )

  it('serves index.html on /tantalus/index.html', () => getHtml('/tantalus/index.html')
    .then($ => $('title').text().should.equal('Tantalus'))
  )

  it('response with same version number and start time multiple times', () => {
    const expectedVersion = 'v' + require('../package.json').version
    return request(app).get('/api/version')
      .expect(200)
      .then(response => {
        const version = response.text
        version.should.startWith(expectedVersion)
        return request(app).get('/api/version')
          .expect(200, version)
      })
  })

  it('response with schedule metadata', () => {
    const createdDate = new Date()
    const testMetadata = {
      type: 'schedule', created: createdDate, graphs: { count: 2 }, ticker: { count: 3 }
    }
    return helpers.insertMetadata([testMetadata])
      .then(() => request(app).get('/api/metadata/schedule')
        .expect(200)
        .then(response => {
          const metadata = response.body
          metadata.graphs.should.deep.equal(testMetadata.graphs)
          metadata.ticker.should.deep.equal(testMetadata.ticker)
          should.equal(moment.utc(metadata.created).isSame(createdDate), true)
        })
      )
  })
})
