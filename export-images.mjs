import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const source = process.argv[2]
if (!source) {
  throw new Error('Usage: node export-images.mjs <absolute-backup-directory>')
}

const root = process.cwd()
const imageDirectory = path.join(root, 'images')
const [tokens, pendingTokens] = await Promise.all([
  readJson(path.join(source, 'tokens.json')),
  readJson(path.join(source, 'pending-tokens.json')),
])

await rm(imageDirectory, { recursive: true, force: true })
await mkdir(imageDirectory, { recursive: true })

const assets = {}
const hashes = new Map()
const records = [...tokens, ...pendingTokens]

for (const record of records) {
  const image = record.image
  if (!image?.cid || !image.localPath || image.status === 'failed') continue

  const sourceFile = path.join(source, image.localPath)
  const contents = await readFile(sourceFile)
  const extension = detectExtension(image.localPath, contents)
  const filename = `${image.cid}${extension}`
  const digest = createHash('sha256').update(contents).digest('hex')
  const existing = hashes.get(image.cid)

  if (existing && existing.digest !== digest) {
    throw new Error(`CID collision with different content: ${image.cid}`)
  }
  if (!existing) {
    await copyFile(sourceFile, path.join(imageDirectory, filename))
    hashes.set(image.cid, { digest, filename })
    assets[image.cid] = filename
  }
}

const orderedAssets = Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)))
const manifest = {
  version: 1,
  sourceBackup: path.basename(source),
  generatedAt: new Date().toISOString(),
  assetCount: Object.keys(orderedAssets).length,
  assets: orderedAssets,
}

await writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(path.join(root, 'cid-map.json'), `${JSON.stringify(orderedAssets, null, 2)}\n`)
console.log(`Exported ${manifest.assetCount} CID-addressed images to ${imageDirectory}`)

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function detectExtension(localPath, contents) {
  const extension = path.extname(localPath).toLowerCase()
  if (extension && extension !== '.bin') return extension

  const brand = contents.subarray(4, 12).toString('ascii')
  if (brand === 'ftypavif' || brand === 'ftypavis') return '.avif'

  return extension || '.bin'
}
