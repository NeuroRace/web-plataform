const sharp = require('sharp');
async function processImage() {
  const { data, info } = await sharp('public/assets/images/mascot-running.png')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  let maxComponentPixels = 0;
  let maxComponentId = 0;
  let components = [];

  let currentId = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = y * w + x;
      if (visited[idx] === 0 && data[idx * 4 + 3] > 0) {
        let pixels = [];
        let queue = [idx];
        visited[idx] = currentId;
        pixels.push(idx);

        let qHead = 0;
        while (qHead < queue.length) {
          let curr = queue[qHead++];
          let cy = Math.floor(curr / w);
          let cx = curr % w;

          const neighbors = [
            [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
            [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
          ];
          for (let [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              let nIdx = ny * w + nx;
              if (visited[nIdx] === 0 && data[nIdx * 4 + 3] > 0) {
                visited[nIdx] = currentId;
                queue.push(nIdx);
                pixels.push(nIdx);
              }
            }
          }
        }
        components.push({ id: currentId, size: pixels.length, pixels });
        if (pixels.length > maxComponentPixels) {
          maxComponentPixels = pixels.length;
          maxComponentId = currentId;
        }
        currentId++;
      }
    }
  }

  console.log('Found', components.length, 'components. Largest has', maxComponentPixels, 'pixels.');

  for (let i = 0; i < data.length / 4; i++) {
    if (visited[i] !== maxComponentId && visited[i] !== 0) {
      data[i * 4 + 3] = 0;
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile('public/assets/images/mascot-running-fixed.png');
  console.log('Saved fixed image.');
}
processImage();
