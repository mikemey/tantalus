const moment = require('moment')

const helpers = require('../utils-test/helpers')
const GraphService = require('../schedule/graphService')
const { supportedPeriods, _1w, _1y } = require('../backend/tickers/graphPeriods')

describe('Graph service', () => {
  const createMetadataMock = () => {
    const received = { count: null }
    const setGraphsCount = count => {
      received.count = count
    }
    return { received, setGraphsCount }
  }

  const metadataMock = createMetadataMock()
  const graphService = GraphService(console, metadataMock)

  beforeEach(helpers.dropDatabase)
  after(helpers.closeMongodb)

  const datePast = daysPast => moment.utc().subtract(daysPast, 'd').toDate()

  const durationBetween = (start, end) => moment.duration(moment.utc(start).diff(moment.utc(end)))

  const _8daysAgo = datePast(8)
  const _6daysAgo = datePast(6)
  const _5daysAgo = datePast(5)
  const _4daysAgo = datePast(4)
  const _3daysAgo = datePast(3)

  const testData = [{
    created: _6daysAgo,
    tickers: [
      { name: 'gdax', bid: 3856.08, ask: 3879.06 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'coindesk', ask: 3821.79 }]
  }, {
    created: _5daysAgo,
    tickers: [
      { name: 'gdax', bid: 3857.84, ask: 3865.78 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'coindesk', ask: 3802.64 }]
  }, {
    created: _4daysAgo,
    tickers: [
      { name: 'gdax', bid: 'N/A', ask: 'N/A' },
      { name: 'coindesk', ask: 3814.19 }]
  }, {
    created: _3daysAgo,
    tickers: [
      { name: 'gdax', bid: 3490, ask: 3567 },
      { name: 'coindesk', ask: 3584.93 }]
  }, {
    created: _8daysAgo,
    tickers: [
      { name: 'gdax', bid: 999999, ask: 999999 },
      { name: 'coindesk', ask: 999999 }]
  }]

  const expectedGraphData = [{
    label: 'coinfloor bid',
    data: [
      { x: _5daysAgo, y: 2222 },
      { x: _6daysAgo, y: 2222 }
    ]
  }, {
    label: 'coindesk',
    data: [
      { x: _3daysAgo, y: 3585 },
      { x: _4daysAgo, y: 3814 },
      { x: _5daysAgo, y: 3803 },
      { x: _6daysAgo, y: 3822 }
    ]
  }, {
    label: 'gdax bid',
    data: [
      { x: _3daysAgo, y: 3490 },
      { x: _5daysAgo, y: 3858 },
      { x: _6daysAgo, y: 3856 }
    ]
  }, {
    label: 'gdax ask',
    data: [
      { x: _3daysAgo, y: 3567 },
      { x: _5daysAgo, y: 3866 },
      { x: _6daysAgo, y: 3879 }
    ]
  }]

  it('should store sorted graph data', () => {
    const graphBucketDuration = 100 // minutes per bucket
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1w))
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.period.should.equal(_1w)

        let graphIx = 0
        doc.graphData.should.have.length(expectedGraphData.length)
        doc.graphData.forEach(graph => {
          const expectedGraph = expectedGraphData[graphIx++]
          graph.label.should.equal(expectedGraph.label)

          graph.data.should.have.length(expectedGraph.data.length)
          let graphCoordIx = 0
          graph.data.forEach(coord => {
            const expectedCoord = expectedGraph.data[graphCoordIx++]
            const bucketStartDiff = durationBetween(coord.x, expectedCoord.x)
            bucketStartDiff.asMinutes().should.be.lessThan(graphBucketDuration)
            coord.y.should.equal(expectedCoord.y)
          })
        })
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
    const tickersPerBucket = 3.65
    const averageIncreasePerBucket = 3.65
    const hoursPerBucket = 87.6

    const createTicker = (created, value) => {
      return {
        created,
        tickers: [
          { name: 'gdax', bid: value, ask: value },
          { name: 'coindesk', ask: value }]
      }
    }

    const testData = Array.from({ length }, (_, ix) => createTicker(datePast(ix), (ix + 1)))

    const oldestDateExpected = testData[Math.floor(365 - tickersPerBucket)].created
    const newestDateExpected = testData[0].created

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

          const oldestSlotDiff = durationBetween(chartData[chartData.length - 1].x, oldestDateExpected)
          oldestSlotDiff.asHours().should.be.lessThan(hoursPerBucket / 2)

          const newestSlotDiff = durationBetween(chartData[0].x, newestDateExpected)
          newestSlotDiff.asHours().should.be.lessThan(hoursPerBucket / 2)

          let currentAverage = averageIncreasePerBucket
          chartData.forEach(datapoint => {
            datapoint.y.should.be.closeTo(currentAverage, 1.01)
            currentAverage = currentAverage + averageIncreasePerBucket
          })
        })
      })
  })

  it('should send metadata to service', () => {
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => metadataMock.received.count.should.equal(supportedPeriods.length))
  })
})
