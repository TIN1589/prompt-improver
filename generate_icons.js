import fs from 'fs';
import path from 'path';

// Tạo thư mục assets nếu chưa có
const assetsDir = path.resolve('assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Minimal valid PNG 1x1 base64 expanded to sizes or valid placeholder
// Tạo file PNG đơn giản bằng base64
const icon16Base64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAFNJREFUOE9jZKAQMFKon2H4f+p/BihmZGD4T6yBDDgV4DMMp2FwG4CknuEIvIZhGI7hZSCx5jEwsJBrIC53k2wgLj8TYyAujZNuIC73k2sgAABn9x8h398Q6gAAAABJRU5ErkJggg==";
const icon48Base64 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAGVJREFUaEPt0sEJACAMBEHB/pt2YAsWEMF/w8zANpmz543P6wE894AvIAICIoCI3oEICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICCwL3ACZ2RkhQ43E/gAAAABJRU5ErkJggg==";
const icon128Base64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAIhJREFUeF7t0QENAAAAwqD3T20PBxQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBkBiogAAHR2n4xAAAAAElFTkSuQmCC";

fs.writeFileSync(path.join(assetsDir, 'icon16.png'), Buffer.from(icon16Base64, 'base64'));
fs.writeFileSync(path.join(assetsDir, 'icon48.png'), Buffer.from(icon48Base64, 'base64'));
fs.writeFileSync(path.join(assetsDir, 'icon128.png'), Buffer.from(icon128Base64, 'base64'));

console.log('✅ Đã tạo các biểu tượng icons trong thư mục assets/: icon16.png, icon48.png, icon128.png');
