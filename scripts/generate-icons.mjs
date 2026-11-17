// Gera os ícones PNG do PWA a partir de um SVG minimalista.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("public/icons");
fs.mkdirSync(out, { recursive: true });

// Marca: quadrado arredondado com um "H" geométrico e um ponto (chave/campainha).
function svg({ size, padding = 0, rounded = true }) {
  const s = 512;
  const inner = s - padding * 2;
  const k = inner / s;
  const o = padding;
  const r = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${r}" fill="#0f766e"/>
    <g transform="translate(${o} ${o}) scale(${k})">
      <rect x="148" y="132" width="52" height="248" rx="26" fill="#ffffff"/>
      <rect x="312" y="132" width="52" height="248" rx="26" fill="#ffffff"/>
      <rect x="148" y="232" width="216" height="48" rx="24" fill="#ffffff"/>
      <circle cx="256" cy="148" r="22" fill="#99f6e4"/>
    </g>
  </svg>`;
}

const jobs = [
  ["icon-192.png", 192, svg({ size: 192 })],
  ["icon-512.png", 512, svg({ size: 512 })],
  ["maskable-512.png", 512, svg({ size: 512, padding: 70, rounded: false })],
  ["apple-touch-icon.png", 180, svg({ size: 180, rounded: false })],
  ["badge-72.png", 72, `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 512 512">
      <rect x="148" y="132" width="52" height="248" rx="26" fill="#fff"/>
      <rect x="312" y="132" width="52" height="248" rx="26" fill="#fff"/>
      <rect x="148" y="232" width="216" height="48" rx="24" fill="#fff"/></svg>`],
];

for (const [name, size, markup] of jobs) {
  await sharp(Buffer.from(markup)).resize(size, size).png().toFile(path.join(out, name));
  console.log("ok", name);
}
fs.writeFileSync(path.resolve("src/app/icon.svg"), svg({ size: 512 }));
console.log("ok src/app/icon.svg");
