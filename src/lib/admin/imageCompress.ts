const MAX_DIMENSION = 1600
const TARGET_BYTES = 300 * 1024

async function loadImageSource(file: File): Promise<
  ImageBitmap | HTMLImageElement
> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

function drawToCanvas(
  source: ImageBitmap | HTMLImageElement,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const sw =
    'width' in source && typeof source.width === 'number'
      ? source.width
      : (source as HTMLImageElement).naturalWidth
  const sh =
    'height' in source && typeof source.height === 'number'
      ? source.height
      : (source as HTMLImageElement).naturalHeight

  let width = sw
  let height = sh
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width)
      width = MAX_DIMENSION
    } else {
      width = Math.round((width * MAX_DIMENSION) / height)
      height = MAX_DIMENSION
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      },
      'image/webp',
      quality,
    )
  })
}

/** Compress an image file to WebP (~300KB, max 1600px). */
export async function compressProductImage(
  file: File,
): Promise<{ blob: Blob; fileName: string }> {
  const source = await loadImageSource(file)
  const { canvas } = drawToCanvas(source)
  if ('close' in source && typeof source.close === 'function') {
    source.close()
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  const fileName = `${baseName}.webp`

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > TARGET_BYTES && quality > 0.35) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, quality)
  }

  return { blob, fileName }
}
