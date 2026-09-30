import fs from 'node:fs/promises'

await fs.mkdir(new URL('../.compiled/src/', import.meta.url), { recursive: true })
await fs.copyFile(new URL('../src/index.css', import.meta.url), new URL('../.compiled/src/index.css', import.meta.url))
