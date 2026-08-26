// codex:2026-08-24T01:02:00+02:00
const path = require('path');
const sharp = require('sharp');

const dir = 'G:/GameDev/CODEX/work/2026-08-24-neuguss-native';
const ids = [
  'elite_slag_hexer', 'elite_wild_wolf', 'elite_high_specter', 'elite_black_witch',
  'elite_crypt_pyroclasp', 'elite_coast_drowned', 'elite_black_golem', 'elite_wild_stag',
  'iron_sentinel', 'elite_crypt_butcher', 'barrow_chanter',
];

(async () => {
  const tile = 300;
  const columns = 4;
  const rows = Math.ceil(ids.length / columns);
  const composites = [];
  for (let index = 0; index < ids.length; index += 1) {
    const input = await sharp(path.join(dir, `${ids[index]}-pink-qa.png`))
      .resize(tile, tile, { fit: 'contain', background: { r: 255, g: 0, b: 255 } })
      .png().toBuffer();
    composites.push({ input, left: (index % columns) * tile, top: Math.floor(index / columns) * tile });
  }
  await sharp({ create: { width: columns * tile, height: rows * tile, channels: 3, background: { r: 30, g: 30, b: 30 } } })
    .composite(composites)
    .png().toFile(path.join(dir, 'pink-qa-contact-sheet.png'));

  // codex:2026-08-24T01:11:00+02:00
  for (const [name, background] of [
    ['black-qa-contact-sheet.png', { r: 0, g: 0, b: 0 }],
    ['gray-qa-contact-sheet.png', { r: 110, g: 110, b: 110 }],
  ]) {
    const tiles = [];
    for (let index = 0; index < ids.length; index += 1) {
      const input = await sharp(path.join('G:/GameDev/ASSETS/neuguss-2026-08-23/fertig', `${ids[index]}.png`))
        .resize(tile, tile, { fit: 'contain', background: { ...background, alpha: 0 } })
        .png().toBuffer();
      tiles.push({ input, left: (index % columns) * tile, top: Math.floor(index / columns) * tile });
    }
    await sharp({ create: { width: columns * tile, height: rows * tile, channels: 3, background } })
      .composite(tiles)
      .png().toFile(path.join(dir, name));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
