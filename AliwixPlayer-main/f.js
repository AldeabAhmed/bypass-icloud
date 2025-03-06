#!/usr/bin/env node

import axios from 'axios';
import { createWriteStream, existsSync, mkdirSync, readdirSync, writeFileSync, createReadStream, readFileSync } from 'fs';
import { EOL } from 'os';
import https from 'https';
import path from 'path';

// تكوين القنوات مع أسمائها المختصرة
const CONFIG = {
  WHITELIST: {
    "BEIN SPORTS 1 (BACKUP) .b": "bein1-b",
    "BEIN SPORTS 1 FHD .b": "bein1fhd-b",
    "BEIN SPORTS 1 HD (BACKUP 2) .b": "bein1hd2-b",
    "BEIN SPORTS 1 HD (BACKUP 3) .b": "bein1hd3-b",
    "BEIN SPORTS 1 HD (BACKUP) .b": "bein1hd-b",
    "BEIN SPORTS 2 (BACKUP) .b": "bein2-b",
    "BEIN SPORTS 2 FHD .b": "bein2fhd-b",
    "BEIN SPORTS 2 HD (BACKUP 2) .b": "bein2hd2-b",
    "BEIN SPORTS 2 HD (BACKUP 3) .b": "bein2hd3-b",
    "BEIN SPORTS 2 HD (BACKUP) .b": "bein2hd-b",
    "BEIN SPORTS 3 (BACKUP) .b": "bein3-b",
    "BEIN SPORTS 3 FHD .b": "bein3fhd-b",
    "BEIN SPORTS 3 HD (BACKUP 2) .b": "bein3hd2-b",
    "BEIN SPORTS 3 HD (BACKUP 3) .b": "bein3hd3-b",
    "BEIN SPORTS 3 HD (BACKUP) .b": "bein3hd-b",
    "BEIN SPORTS 4 (BACKUP) .b": "bein4-b",
    "BEIN SPORTS 4 FHD .b": "bein4fhd-b",
    "BEIN SPORTS 4 HD (BACKUP 2) .b": "bein4hd2-b",
    "BEIN SPORTS 4 HD (BACKUP) .b": "bein4hd-b",
    "BEIN SPORTS 4 HD LOCAL .b": "bein4hdlocal-b"
  },
  API_ENDPOINTS: {
    resolve: "https://vavoo.to/vto-cluster/mediahubmx-resolve.json",
    catalog: "https://vavoo.to/vto-cluster/mediahubmx-catalog.json",
    ping: "https://www.vavoo.tv/api/app/ping"
  },
  HEADERS: {
    common: {
      'User-Agent': 'MediaHubMX/2',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
};

// إعداد السجل للقنوات المستبعدة
const logger = createWriteStream('excluded_channels.log', { flags: 'a' });
const logMessage = message => logger.write(`${new Date().toISOString()} - ${message}${EOL}`);

// دوال مساعدة
const sanitizeTvgId = channelName => {
  const cleaned = channelName.replace(/\.[cs]$/i, '').trim();
  return cleaned.split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getCategory = () => 'BEIN SPORTS';

// دالة لجلب توقيع المصادقة
async function getAuthSignature() {
  const url = CONFIG.API_ENDPOINTS.ping;
  const headers = {
    "User-Agent": "okhttp/4.11.0",
    "Accept": "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "Accept-Encoding": "gzip"
  };
  const data = {
    "token": "8Us2TfjeOFrzqFFTEjL3E5KfdAWGa5PV3wQe60uK4BmzlkJRMYFu0ufaM_eeDXKS2U04XUuhbDTgGRJrJARUwzDyCcRToXhW5AcDekfFMfwNUjuieeQ1uzeDB9YWyBL2cn5Al3L3gTnF8Vk1t7rPwkBob0swvxA",
    "reason": "player.enter",
    "locale": "de",
    "theme": "dark",
    "metadata": {
      "device": { "type": "Handset", "brand": "google", "model": "Nexus 5", "name": "21081111RG", "uniqueId": "d10e5d99ab665233" },
      "os": { "name": "android", "version": "7.1.2", "abis": ["arm64-v8a", "armeabi-v7a", "armeabi"], "host": "android" },
      "app": { "platform": "android", "version": "3.0.2", "buildId": "288045000", "engine": "jsc", "signatures": ["09f4e07040149486e541a1cb34000b6e12527265252fa2178dfe2bd1af6b815a"], "installer": "com.android.secex" },
      "version": { "package": "tv.vavoo.app", "binary": "3.0.2", "js": "3.1.4" }
    },
    "appFocusTime": 27229,
    "playerActive": true,
    "playDuration": 0,
    "devMode": false,
    "hasAddon": true,
    "castConnected": false,
    "package": "tv.vavoo.app",
    "version": "3.1.4",
    "process": "app",
    "firstAppStart": 1728674705639,
    "lastAppStart": 1728674705639,
    "ipLocation": "",
    "adblockEnabled": true,
    "proxy": { "supported": ["ss"], "engine": "ss", "enabled": false, "autoServer": true, "id": "ca-bhs" },
    "iap": { "supported": false }
  };

  try {
    const response = await axios.post(url, data, { headers, responseType: 'json' });
    return response.data.addonSig || null;
  } catch (error) {
    console.error("خطأ في جلب التوقيع:", error.message);
    return null;
  }
}

// الكلاس الرئيسي لتوليد M3U
class M3UGenerator {
  constructor() {
    this.outputDir = 'beIN-m3u8';
    this.ensureDirectoryExists();
  }

  async initializeSignature() {
    this.signature = await getAuthSignature();
    if (!this.signature) {
      throw new Error("فشل في جلب توقيع المصادقة");
    }
  }

  ensureDirectoryExists() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async resolveLink(originalLink) {
    if (originalLink.includes('localhost')) return originalLink;

    try {
      const { data } = await axios.post(CONFIG.API_ENDPOINTS.resolve, {
        language: "de",
        region: "AT",
        url: originalLink,
        clientVersion: "3.0.2"
      }, {
        headers: { ...CONFIG.HEADERS.common, 'mediahubmx-signature': this.signature }
      });

      return Array.isArray(data) && data[0]?.url ? data[0].url : null;
    } catch (error) {
      console.error(`خطأ في تحليل الرابط: ${error.message}`);
      return null;
    }
  }

  async fetchChannelList(group = "Arabia") {
    let cursor = 0;
    const allItems = [];

    while (true) {
      try {
        const { data } = await axios.post(CONFIG.API_ENDPOINTS.catalog, {
          language: "en",
          region: "LY",
          catalogId: "vto-iptv",
          id: "vto-iptv",
          adult: false,
          search: "",
          sort: "name",
          filter: { group },
          cursor,
          clientVersion: "3.0.2"
        }, {
          headers: { ...CONFIG.HEADERS.common, 'mediahubmx-signature': this.signature }
        });

        if (!data.items?.length) break;
        allItems.push(...data.items);
        cursor += data.items.length;
      } catch (error) {
        console.error(`خطأ في جلب القنوات: ${error.message}`);
        break;
      }
    }

    return { items: allItems };
  }

  async generateM3U() {
    console.log('جاري جلب توقيع المصادقة...');
    await this.initializeSignature();

    console.log('جاري جلب قائمة القنوات...');
    const channels = await this.fetchChannelList();

    if (!channels.items?.length) {
      console.error('لا توجد قنوات متاحة');
      return;
    }

    console.log(`جاري معالجة ${channels.items.length} قناة...`);
    const mainFilePath = `${this.outputDir}/beinm3u8.m3u8`;
    const mainWriteStream = createWriteStream(mainFilePath, { encoding: 'utf8' });
    mainWriteStream.write('#EXTM3U\n');

    let addedChannels = 0;

    for (const [index, item] of channels.items.entries()) {
      const originalName = item.name?.trim() || 'Unknown';
      const normalizedName = originalName.replace(/\s+/g, ' ');

      const channelShortName = CONFIG.WHITELIST[normalizedName];
      if (!channelShortName) {
        logMessage(`تم استبعاد القناة: ${originalName}`);
        continue;
      }

      const resolvedUrl = await this.resolveLink(item.url);
      if (!resolvedUrl) continue;

      const tvgId = sanitizeTvgId(originalName);
      const category = getCategory();

      const channelContent = `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${tvgId}" tvg-logo="" group-title="${category}",${tvgId}${EOL}` +
        `#EXTVLCOPT:http-user-agent=okhttp/4.11.0${EOL}` +
        `#EXTVLCOPT:http-origin=https://vavoo.to/${EOL}` +
        `#EXTVLCOPT:http-referrer=https://vavoo.to/${EOL}` +
        `${resolvedUrl}${EOL}`;

      const channelFilePath = `${this.outputDir}/${channelShortName}.m3u8`;
      const channelWriteStream = createWriteStream(channelFilePath, { encoding: 'utf8' });
      channelWriteStream.write(channelContent);
      channelWriteStream.end();

      mainWriteStream.write(channelContent);

      addedChannels++;
      console.log(`تمت معالجة ${index + 1}/${channels.items.length}: ${originalName} => ${channelShortName}.m3u8`);
    }

    mainWriteStream.end();
    console.log(`\nتم إنشاء ${mainFilePath} بـ ${addedChannels} قناة`);

    await this.generateHTML();
    this.startServer();
  }

  getUrlFromM3U8(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(EOL);
    for (const line of lines) {
      if (line.startsWith('https://')) {
        return line.trim();
      }
    }
    return null;
  }

  async generateHTML() {
    const files = readdirSync(this.outputDir).filter(file => file.endsWith('.m3u8') && file !== 'beinm3u8.m3u8');
    const channels = {
      "BEIN SPORTS 1": [],
      "BEIN SPORTS 2": [],
      "BEIN SPORTS 3": [],
      "BEIN SPORTS 4": []
    };

    files.forEach(file => {
      if (file.startsWith('bein1')) channels["BEIN SPORTS 1"].push(file);
      else if (file.startsWith('bein2')) channels["BEIN SPORTS 2"].push(file);
      else if (file.startsWith('bein3')) channels["BEIN SPORTS 3"].push(file);
      else if (file.startsWith('bein4')) channels["BEIN SPORTS 4"].push(file);
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>عالم كرة القدم - BEIN SPORTS</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #1a3c34, #2e7d32);
      color: #fff;
      margin: 0;
      padding: 20px;
      direction: rtl;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-x: hidden;
    }
    h1 {
      font-size: 2.5em;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.7);
      animation: fadeIn 1.5s ease-in;
      margin-bottom: 10px;
    }
    .slogan {
      font-size: 1.2em;
      color: #ffd700;
      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
      margin-bottom: 20px;
      animation: slideIn 2s ease;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      width: 100%;
      max-width: 1200px;
    }
    .channel {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 15px;
      padding: 15px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      width: 220px;
    }
    .channel:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
    }
    button.channel-btn {
      padding: 12px 20px;
      font-size: 1.1em;
      background: #d32f2f;
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      width: 100%;
      transition: background 0.3s ease, transform 0.2s ease;
    }
    button.channel-btn:hover {
      background: #b71c1c;
      transform: scale(1.05);
    }
    .options {
      display: none;
      margin-top: 10px;
    }
    button.option-btn {
      padding: 8px 15px;
      margin: 5px 0;
      background: #1976d2;
      border: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      width: 100%;
      transition: background 0.3s ease, transform 0.2s ease;
    }
    button.option-btn:hover {
      background: #115293;
      transform: translateX(5px);
    }
    .player-container {
      margin-top: 30px;
      width: 100%;
      max-width: 800px;
      height: 450px;
      background: #000;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.7);
      overflow: hidden;
      position: relative;
      animation: fadeIn 1s ease-in;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .options.show {
      display: block;
      animation: slideIn 0.5s ease;
    }
    @media (max-width: 600px) {
      .channel { width: 100%; }
      h1 { font-size: 2em; }
      .slogan { font-size: 1em; }
      .player-container { height: 300px; }
    }
  </style>
</head>
<body>
  <h1>عالم كرة القدم - BEIN SPORTS</h1>
  <div class="slogan">استمتع بكل لحظة من المباريات العالمية!</div>
  <div class="container">
    ${Object.entries(channels).map(([name, options]) => `
      <div class="channel">
        <button class="channel-btn" onclick="toggleOptions('${name}')">${name}</button>
        <div id="${name.replace(/\s/g, '-')}-options" class="options">
          ${options.map(file => {
            const filePath = path.join(this.outputDir, file);
            const url = this.getUrlFromM3U8(filePath) || '';
            return `<button class="option-btn" onclick="loadPlayer('${url}')">${file.replace('.m3u8', '')}</button>`;
          }).join('')}
        </div>
      </div>
    `).join('')}
  </div>
  <div class="player-container">
    <iframe id="player" src="https://aldeab-z.x10.mx/iDEB.html" allowfullscreen></iframe>
  </div>
  <script>
    function toggleOptions(channel) {
      const options = document.getElementById(channel.replace(/\\s/g, '-') + '-options');
      options.classList.toggle('show');
    }
    function loadPlayer(url) {
      const player = document.getElementById('player');
      player.src = 'https://aldeab-z.x10.mx/iDEB.html?src=' + encodeURIComponent(url);
    }
  </script>
</body>
</html>
    `;

    writeFileSync(`${this.outputDir}/index.html`, htmlContent, { encoding: 'utf8' });
    console.log(`تم إنشاء صفحة HTML في ${this.outputDir}/index.html`);
  }

  startServer() {
    const server = https.createServer({
      key: readFileSync(path.join(process.cwd(), 'beIN-m3u8', 'key.pem')),
      cert: readFileSync(path.join(process.cwd(), 'beIN-m3u8', 'cert.pem'))
    }, (req, res) => {
      // تعزيز رؤوس CORS
      res.setHeader('Access-Control-Allow-Origin', '*'); // السماح للجميع (يمكنك تحديد 'https://aldeab-z.x10.mx' فقط)
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const filePath = path.join(process.cwd(), this.outputDir, req.url === '/' ? 'index.html' : req.url.split('/').pop());
      if (existsSync(filePath)) {
        const contentType = filePath.endsWith('.html') ? 'text/html' : 'application/x-mpegURL';
        res.writeHead(200, { 'Content-Type': contentType });
        createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    });

    const PORT = 9090;
    const IP = '192.168.2.158'; // الاستماع على كل الواجهات في بيئة سحابية
    server.listen(PORT, IP, () => {
      console.log(`الخادم يعمل على https://${IP}:${PORT}`);
      console.log(`افتح https://<your-cloud-ip>:${PORT} في المتصفح لاختيار القنوات`);
      console.log('ملاحظة: استبدل <your-cloud-ip> بعنوان IP العام الخاص بالخادم السحابي');
    });
  }
}

// تنفيذ العملية
(async () => {
  try {
    const generator = new M3UGenerator();
    await generator.generateM3U();
    console.log('اكتملت العملية بنجاح');
  } catch (error) {
    console.error(`خطأ فادح: ${error.message}`);
    process.exit(1);
  }
})();
