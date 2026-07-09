/**
 * Export SVG logos to PNG (single source of truth → consistent raster assets).
 * Usage: npm run export-logos
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Resvg } from '@resvg/resvg-js'

const assets = join(process.cwd(), 'assets')
const build = join(process.cwd(), 'build')
const publicDir = join(process.cwd(), 'src/renderer/public')

function renderPng(svgPath: string, width: number, transparent = false): Buffer {
  const data = readFileSync(svgPath)
  const resvg = new Resvg(data, {
    fitTo: { mode: 'width', value: width },
    background: transparent ? 'rgba(0,0,0,0)' : undefined
  })
  return Buffer.from(resvg.render().asPng())
}

const exports = [
  { svg: 'logo-tree.svg', png: 'logo-tree-only.png', width: 512, transparent: true },
  { svg: 'logo-icon.svg', png: 'logo-icon.png', width: 512, transparent: false },
  { svg: 'logo-readme.svg', png: 'logo-readme-banner.png', width: 1040, transparent: true }
] as const

for (const { svg, png, width, transparent } of exports) {
  writeFileSync(join(assets, png), renderPng(join(assets, svg), width, transparent))
  console.log(`✓ assets/${png}`)
}

mkdirSync(build, { recursive: true })
mkdirSync(publicDir, { recursive: true })

const iconSvg = join(assets, 'logo-icon.svg')
writeFileSync(join(build, 'icon.png'), renderPng(iconSvg, 1024))
writeFileSync(join(publicDir, 'favicon.png'), renderPng(iconSvg, 64))
console.log('✓ build/icon.png')
console.log('✓ src/renderer/public/favicon.png')
