const TraderConfigsGenerator = require('../../backend/simrun/traderConfigsGenerator')

describe('config permutations', () => {
  const configGenerator = TraderConfigsGenerator().create

  const createRangeConfig = ({
    timeslotSeconds = { start: 200, end: 200, step: 10 },
    bRatioR = { start: 3.2, end: 3.2, step: 0.5 },
    bUseTimeslotsR = { start: 4, end: 4, step: 1 },
    sRatioR = { start: -0.6, end: -0.6, step: 0.5 },
    sUseTimeslotsR = { start: 3, end: 3, step: 1 }
  }) => {
    return {
      timeslotSeconds,
      buying: { ratio: bRatioR, useTimeslots: bUseTimeslotsR },
      selling: { ratio: sRatioR, useTimeslots: sUseTimeslotsR }
    }
  }

  const expectConfigEntryParameters =
    (config, expectedTS, expectedBR, expectedBU, expectedSR, expectedSU) => {
      config.timeslotSeconds.should.equal(expectedTS, 'timeslotSeconds')
      config.buying.ratio.should.equal(expectedBR, 'buying.ratio')
      config.buying.useTimeslots.should.equal(expectedBU, 'buying.useTimeslots')
      config.selling.ratio.should.equal(expectedSR, 'selling.ratio')
      config.selling.useTimeslots.should.equal(expectedSU, 'selling.useTimeslots')
    }

  it('should generate single config', () => {
    const generator = configGenerator(createRangeConfig({}))
    generator.should.have.length(1)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -0.6, 3)
  })

  it('should produce cartesian product for one parameter array', () => {
    const generator = configGenerator(createRangeConfig({
      timeslotSeconds: { start: 200, end: 210, step: 10 }
    }))
    generator.should.have.length(2)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -0.6, 3)
    expectConfigEntryParameters(generator.next(), 210, 3.2, 4, -0.6, 3)
  })

  it('should produce cartesian product for positive rational number', () => {
    const generator = configGenerator(createRangeConfig({
      bRatioR: { start: 3.2, end: 4.3, step: 0.5 }
    }))
    generator.should.have.length(3)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -0.6, 3)
    expectConfigEntryParameters(generator.next(), 200, 3.7, 4, -0.6, 3)
    expectConfigEntryParameters(generator.next(), 200, 4.2, 4, -0.6, 3)
  })

  it('should produce cartesian product for negative rational number', () => {
    const generator = configGenerator(createRangeConfig({
      sRatioR: { start: -1, end: -0.8, step: 0.09 }
    }))
    generator.should.have.length(3)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -1, 3)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -0.91, 3)
    expectConfigEntryParameters(generator.next(), 200, 3.2, 4, -0.82, 3)
  })

  it('should produce cartesian product for all parameter arrays', () => {
    const generator = configGenerator(createRangeConfig({
      timeslotSeconds: { start: 200, end: 210, step: 10 },
      bRatioR: { start: 3.2, end: 3.9, step: 0.5 },
      bUseTimeslotsR: { start: 4, end: 5, step: 1 },
      sRatioR: { start: -0.7, end: -0.6, step: 0.1 },
      sUseTimeslotsR: { start: 3, end: 4, step: 1 }
    }))
    generator.should.have.length(32)
    expectConfigEntryParameters(generator.nth(31), 210, 3.7, 5, -0.6, 4)

    generator.forEach(config => {
      config.timeslotSeconds.should.be.within(200, 210)
      config.buying.ratio.should.be.within(3.2, 3.7)
      config.buying.useTimeslots.should.be.within(4, 5)
      config.selling.ratio.should.be.within(-0.7, -0.6)
      config.selling.useTimeslots.should.be.within(3, 4)
    })
  })

  it('generate realistic example', () => {
    const generator = configGenerator(createRangeConfig({
      timeslotSeconds: { start: 50, end: 500, step: 30 },
      bRatioR: { start: 2, end: 10, step: 0.5 },
      bUseTimeslotsR: { start: 2, end: 10, step: 1 },
      sRatioR: { start: -2.0, end: 0, step: 0.5 },
      sUseTimeslotsR: { start: 2, end: 7, step: 1 }
    }))
    generator.should.have.length(73440)
  })

  it('should generate the clientIds', () => {
    const generator = configGenerator(createRangeConfig({
      timeslotSeconds: { start: 300, end: 300, step: 10 },
      bRatioR: { start: 3.4, end: 3.4, step: 0.5 },
      bUseTimeslotsR: { start: 5, end: 5, step: 1 },
      sRatioR: { start: -0.2, end: 0, step: 0.1 },
      sUseTimeslotsR: { start: 3, end: 3, step: 1 }
    }))
    generator.should.have.length(3)
    generator.next().clientId.should.equal('T( 300)_B( 3.4 / 5)_S(-0.2 / 3)')
    generator.next().clientId.should.equal('T( 300)_B( 3.4 / 5)_S(-0.1 / 3)')
    generator.next().clientId.should.equal('T( 300)_B( 3.4 / 5)_S(   0 / 3)')
  })

  it('should attach additional config', () => {
    const additionalConfig = {
      some: 'value',
      buying: { another: 'also value' }
    }
    const generator = configGenerator(createRangeConfig({}), additionalConfig)
    generator.should.have.length(1)
    const createdConfig = generator.next()
    createdConfig.some.should.equal(additionalConfig.some)
    createdConfig.buying.another.should.equal(additionalConfig.buying.another)
  })
})
