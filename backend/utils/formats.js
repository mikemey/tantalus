const rate = input => {
  const num = Number(input)
  if (isNaN(num)) {
    return 'unable to parse: ' + input
  }
  return num.toFixed(0)
}

module.exports = {
  rate
}
