// test-worker.js (修正版)
const WebSocket = require('ws');

// --- 请再次确认密码 ---
const workerDomain = 'daili.pengproxyz.icu';
const password = '4056063'; // 确认这是你在 worker.js 中设置的密码
const targetHost = 'www.baidu.com';   // 换成一个普通 HTTP 网站
const targetPort = 80;              // 换成 HTTP 端口 80
// -------------------------

const ws = new WebSocket(`wss://${workerDomain}/`, {
    headers: { 'Host': workerDomain }
});

ws.on('open', function open() {
    console.log('✅ WebSocket 连接已建立。');

    const authPayload = JSON.stringify({
        hostname: targetHost,
        port: targetPort,
        psw: password
    });
    console.log('-> 正在发送认证信息:', authPayload);
    ws.send(authPayload);

    const httpRequest = `GET / HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`;
    console.log(`-> 正在通过隧道向 ${targetHost} 发送 HTTP 请求...`);
    ws.send(httpRequest);
});

ws.on('message', function incoming(data) {
    console.log('<- 从 Worker 收到响应:');
    console.log(data.toString());
    // 收到响应后，服务器会自动关闭连接 (因为我们发送了 Connection: close)
});

ws.on('close', (code, reason) => {
    console.log('🔌 WebSocket 连接已关闭。');
});

ws.on('error', (error) => {
    console.error('❌ WebSocket 发生错误:', error.message);
});