import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url));
export async function makeFixture(){
  const outDir=path.join(here,'fixture');await fs.mkdir(outDir,{recursive:true});
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f5efe4"/>
    <rect x="0" y="0" width="200" height="200" fill="#f8f2e8"/>
    <circle cx="100" cy="110" r="55" fill="#f0c7a4"/>
    <path d="M45 107L52 60L78 31L119 29L151 52L162 101L146 85L127 62L111 91L94 58L77 91L60 84Z" fill="#583c28"/>
    <path d="M147 57L174 50L165 77Z" fill="#d34d56"/>
    <path d="M157 61L188 84L167 115L153 87Z" fill="#67452d"/>
    <rect x="200" y="0" width="200" height="200" fill="#f8f2e8"/>
    <circle cx="300" cy="110" r="55" fill="#f0c7a4"/>
    <path d="M247 108L250 63L270 39L300 30L332 41L353 67L355 109L342 88L326 67L308 93L291 61L275 91L261 84Z" fill="#5a3c27"/>
    <path d="M270 41L281 14L300 29L316 11L329 45Z" fill="#68472f"/>
    <rect x="0" y="200" width="200" height="200" fill="#f8f2e8"/>
    <path d="M39 299Q62 262 94 279Q128 255 161 297Q128 341 95 320Q63 340 39 299Z" fill="#2a1b18"/>
    <path d="M48 299Q64 273 92 287Q123 267 150 298Q124 327 96 311Q67 325 48 299Z" fill="#fffaf0"/>
    <ellipse cx="81" cy="300" rx="18" ry="25" fill="#80552f"/><ellipse cx="121" cy="297" rx="18" ry="25" fill="#80552f"/>
    <ellipse cx="82" cy="302" rx="8" ry="14" fill="#241714"/><ellipse cx="122" cy="299" rx="8" ry="14" fill="#241714"/>
    <circle cx="76" cy="292" r="4" fill="#ffffff"/><circle cx="116" cy="289" r="4" fill="#ffffff"/>
    <rect x="200" y="200" width="200" height="200" fill="#f8f2e8"/>
    <path d="M239 300Q265 271 298 286Q330 269 362 300Q332 327 299 315Q265 329 239 300Z" fill="#281b18"/>
    <path d="M249 300Q269 280 297 293Q326 280 351 300Q326 319 300 309Q272 320 249 300Z" fill="#fffaf0"/>
    <ellipse cx="283" cy="300" rx="15" ry="19" fill="#6f4b2c"/><ellipse cx="322" cy="298" rx="15" ry="19" fill="#6f4b2c"/>
    <ellipse cx="285" cy="301" rx="7" ry="11" fill="#211714"/><ellipse cx="324" cy="299" rx="7" ry="11" fill="#211714"/>
    <circle cx="279" cy="294" r="3.5" fill="#ffffff"/><circle cx="318" cy="292" r="3.5" fill="#ffffff"/>
  </svg>`;
  const file=path.join(outDir,'parts.png');await sharp(Buffer.from(svg)).png().toFile(file);return file;
}

if(import.meta.url===`file://${process.argv[1]}`){const file=await makeFixture();console.log(file);}
