const sharp = require('sharp');
async function processImage(fileIn, fileOut) {
  const { data, info } = await sharp(fileIn)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h); // Max possible size

  let maxComponentPixels = 0;
  let maxComponentId = 0;

  let currentId = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let idx = y * w + x;
      if (visited[idx] === 0 && data[idx * 4 + 3] > 0) {
        let qHead = 0;
        let qTail = 0;
        
        visited[idx] = currentId;
        queue[qTail++] = idx;

        while (qHead < qTail) {
          let curr = queue[qHead++];
          let cy = Math.floor(curr / w);
          let cx = curr % w;

          const neighbors = [
            [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
            [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
          ];
          for (let i = 0; i < 8; i++) {
            let nx = neighbors[i][0];
            let ny = neighbors[i][1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              let nIdx = ny * w + nx;
              if (visited[nIdx] === 0 && data[nIdx * 4 + 3] > 0) {
                visited[nIdx] = currentId;
                queue[qTail++] = nIdx;
              }
            }
          }
        }
        
        if (qTail > maxComponentPixels) {
          maxComponentPixels = qTail;
          maxComponentId = currentId;
        }
        currentId++;
      }
    }
  }

  console.log('Processed', fileIn, '- max component size:', maxComponentPixels);

  for (let i = 0; i < data.length / 4; i++) {
    if (visited[i] !== maxComponentId && visited[i] !== 0) {
      data[i * 4 + 3] = 0;
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(fileOut);
  console.log('Saved', fileOut);
}

processImage('public/assets/images/mascot-running.png', 'public/assets/images/mascot-running-fixed.png');

