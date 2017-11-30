/* global describe before beforeEach it */
const moment = require('moment')

const helpers = require('../utils-test/helpers')
const GraphService = require('../schedule/graphService')
const { _1w, _1y } = require('../backend/tickers/graphPeriods')

describe('Graph service', () => {
  const graphService = GraphService(console)

  beforeEach(helpers.dropDatabase)

  const datePast = daysPast => moment.utc().subtract(daysPast, 'd').toDate()

  const _8daysAgo = datePast(8)
  const _6daysAgo = datePast(6)
  const _5daysAgo = datePast(5)
  const _4daysAgo = datePast(4)
  const _3daysAgo = datePast(3)

  const testData = [{
    created: _6daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 3856.08, ask: 3879.06 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'coindesk', ask: 3821.79 }]
  }, {
    created: _5daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 3857.84, ask: 3865.78 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'coindesk', ask: 3802.64 }]
  }, {
    created: _4daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 'N/A', ask: 'N/A' },
      { name: 'coindesk', ask: 3814.19 }]
  }, {
    created: _3daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 3490, ask: 3567 },
      { name: 'coindesk', ask: 3584.93 }]
  }, {
    created: _8daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 999999, ask: 999999 },
      { name: 'coindesk', ask: 999999 }]
  }]

  const expectedGraphData = [{
    label: 'coinfloor bid',
    data: [
      { x: _6daysAgo, y: 2222 },
      { x: _5daysAgo, y: 2222 }
    ]
  }, {
    label: 'coinfloor ask',
    data: [
      { x: _6daysAgo, y: null },
      { x: _5daysAgo, y: null }
    ]
  }, {
    label: 'lakebtc bid',
    data: [
      { x: _6daysAgo, y: 3856 },
      { x: _5daysAgo, y: 3858 },
      { x: _4daysAgo, y: null },
      { x: _3daysAgo, y: 3490 }
    ]
  }, {
    label: 'lakebtc ask',
    data: [
      { x: _6daysAgo, y: 3879 },
      { x: _5daysAgo, y: 3866 },
      { x: _4daysAgo, y: null },
      { x: _3daysAgo, y: 3567 }
    ]
  }, {
    label: 'coindesk',
    data: [
      { x: _6daysAgo, y: 3822 },
      { x: _5daysAgo, y: 3803 },
      { x: _4daysAgo, y: 3814 },
      { x: _3daysAgo, y: 3585 }
    ]
  }]

  it('should store sorted graph data', () => {
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1w))
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.period.should.equal(_1w)
        doc.graphData.should.deep.equal(expectedGraphData)
      })
  })

  it('should overwrite graph data', () => {
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1w))
      .then(docs => docs.length.should.equal(1))
  })

  it(`should store the average of at most ${graphService.LIMIT_RESULTS} data points`, () => {
    const length = 500
    const cutoffIx = length - 365

    const createTicker = (created, ix) => {
      return {
        created,
        tickers: [
          { name: 'lakebtc', bid: ix, ask: ix },
          { name: 'coindesk', ask: ix }]
      }
    }

    const testData = Array.from({ length }, (_, ix) => createTicker(datePast(length - 1 - ix), (ix + 1)))

    const sliceLen = (length - cutoffIx) / graphService.LIMIT_RESULTS
    const oldestDateExpected = moment.utc(testData[cutoffIx + 1].created).toJSON()
    const newestDateExpected = moment.utc(testData[length - Math.floor(sliceLen / 2) - 1].created).toJSON()

    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1y))
      .then(docs => {
        const result = docs[0]
        result.period.should.equal(_1y)
        result.graphData.should.have.length(3)
        result.graphData.forEach(chart => {
          const chartData = chart.data
          chartData.should.have.length(graphService.LIMIT_RESULTS)

          chartData[0].x.toJSON().should.equal(oldestDateExpected)
          chartData[chartData.length - 1].x.toJSON().should.equal(newestDateExpected)

          let currentAverage = (cutoffIx + 2)
          chartData.forEach((datapoint, ix) => {
            datapoint.y.should.be.closeTo(currentAverage, 1.0)
            currentAverage = currentAverage + sliceLen
          })
        })
      })
  })
})
