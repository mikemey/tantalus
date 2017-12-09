/* global THREE requestAnimationFrame */

const maxLength = 150
const maxWidth = 100
const maxHeight = 50

const additionalAxisLength = 30
const spaceColor = 0xFFD993
const lineColor = 0xFF0000

const RED = {r: 255, g: 0, b: 0}
const BLUE = {r: 0, g: 0, b: 255}

// ---------------------------------------------------------
const colorMaterialMap = new Map()

const heightColor = normalizedHeight => {
  return lineColor
}
const addLine = (scene, color, x1, y1, z1, x2, y2, z2) => {
  if (!colorMaterialMap.has(color)) {
    const material = new THREE.LineBasicMaterial({ color })
    colorMaterialMap.set(color, material)
  }
  const material = colorMaterialMap.get(color)

  const geometry = new THREE.Geometry()
  geometry.vertices.push(new THREE.Vector3(x1, y1, z1))
  geometry.vertices.push(new THREE.Vector3(x2, y2, z2))

  const axisLine = new THREE.Line(geometry, material)
  scene.add(axisLine)
}

const axisDatas = [
  { name: 'x-axis', color: 0xFF0000, x: maxLength + additionalAxisLength, y: 0, z: 0 },
  { name: 'y-axis', color: 0x00FF00, x: 0, y: maxWidth + additionalAxisLength, z: 0 },
  { name: 'z-axis', color: 0x0000FF, x: 0, y: 0, z: maxHeight + additionalAxisLength }
]

const buildCoordinateSystem = scene => axisDatas.forEach(addAxisTo(scene))

const addAxisTo = scene => axisData => {
  addLine(scene, axisData.color, 0, 0, 0, axisData.x, axisData.y, axisData.z)
}

const drawSpace = scene => {
  // -- bottom part
  addLine(scene, spaceColor, maxLength, 0, 0, maxLength, maxWidth, 0)
  addLine(scene, spaceColor, maxLength, maxWidth, 0, 0, maxWidth, 0)
  // -- top plane
  // addLine(scene, spaceColor, 0, 0, maxHeight, maxLength, 0, maxHeight)
  addLine(scene, spaceColor, maxLength, 0, maxHeight, maxLength, maxWidth, maxHeight)
  addLine(scene, spaceColor, maxLength, maxWidth, maxHeight, 0, maxWidth, maxHeight)
  addLine(scene, spaceColor, 0, maxWidth, maxHeight, 0, 0, maxHeight)
  // -- vertical lines
  addLine(scene, spaceColor, maxLength, 0, 0, maxLength, 0, maxHeight)
  addLine(scene, spaceColor, maxLength, maxWidth, 0, maxLength, maxWidth, maxHeight)
  addLine(scene, spaceColor, 0, maxWidth, 0, 0, maxWidth, maxHeight)
}

const drawIterations = (scene, iterationData) => {
  const lengthRatio = maxLength / Math.max(...iterationData.map(it => it.investDiffs.length))
  const widthRatio = maxWidth / iterationData.length

  const heightRatio = maxHeight / Math.max(...iterationData
    .map(it => Math.max(...it.investDiffs))
  )

  iterationData.forEach(drawIteration(scene, lengthRatio, widthRatio, heightRatio))
}

const drawIteration = (scene, lengthRatio, widthRatio, heightRatio) => it => {
  const y = it.ix * widthRatio
  it.investDiffs
    .map((diff, ix) => {
      const z = diff * heightRatio
      return {
        x: maxLength - (ix * lengthRatio),
        y,
        z,
        color: heightColor(z)
      }
    })
    .reduce((prev, curr) => {
      if (prev) addLine(scene, prev.color, prev.x, prev.y, prev.z, curr.x, curr.y, curr.z)
      return curr
    }, 0)
  // .forEach(coords => {
  //   addLine(scene, lineColor, coords.x, coords.y, 0, coords.x, y, coords.z)
  // })
}

const createTestData = () => {
  const data = []
  const itCount = 40

  const maxDiff = 3000
  let diffNum = 7
  const maxDiffNum = 100
  const diffSteps = (maxDiffNum - diffNum) / itCount
  for (let ix = 0; ix < itCount; ix++) {
    const investDiffs = Array.from({ length: diffNum }, (_, i) => Math.random() * maxDiff)
      .sort((a, b) => b - a)

    diffNum += diffSteps
    data.push({
      ix,
      investDiffs
    })
  }
  return data
}

const IterationController = () => {
  const data = {
    renderer: null,
    camera: null,
    scene: null
  }

  const setup = () => {
    data.renderer = new THREE.WebGLRenderer()
    data.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(data.renderer.domElement)

    data.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000)
    data.camera.position.set(70, -100, maxHeight * 2)
    data.camera.rotateX(1.1)
    data.camera.rotateY(-0.1)
    data.camera.rotateZ(-0.14)
    // data.camera.lookAt(new THREE.Vector3(0, 0, 0))

    data.scene = new THREE.Scene()
    data.scene.background = new THREE.Color(0xffffff)
  }

  const render = () => {
    buildCoordinateSystem(data.scene)
    drawSpace(data.scene)

    const iterationData = createTestData()

    drawIterations(data.scene, iterationData)
    data.renderer.render(data.scene, data.camera)
  }

  const animate = () => {
    requestAnimationFrame(animate)
    // do some
    data.renderer.render(data.scene, data.camera)
  }

  setup()
  render()
  // animate()
}

IterationController()
