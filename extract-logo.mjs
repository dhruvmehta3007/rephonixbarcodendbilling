import fs from 'fs';
const svg = fs.readFileSync('public/rephonix-logo.svg', 'utf8');
const startTag = 'xlink:href="data:image/jpeg;base64,';
const startIdx = svg.indexOf(startTag);
if (startIdx !== -1) {
  const dataStart = startIdx + startTag.length;
  const endIdx = svg.indexOf('"', dataStart);
  const rawBase64 = svg.substring(dataStart, endIdx);
  const cleanBase64 = rawBase64.replace(/\s+/g, '');
  fs.writeFileSync('public/rephonix-extracted.jpg', Buffer.from(cleanBase64, 'base64'));
  console.log('Successfully extracted rephonix-extracted.jpg, bytes:', fs.statSync('public/rephonix-extracted.jpg').size);
} else {
  console.log('Start tag not found in SVG');
}
