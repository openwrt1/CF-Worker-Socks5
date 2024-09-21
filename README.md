# CF-Worker-Socks

### 基于 Cloudflare Worker 的 SOCKS5 代理服务器

一个部署在 Cloudflare Worker 上的代理工具

### 主要更新

- 优化了 WebSocket 连接逻辑,支持自定义 Worker IP 和端口
- 增加了对 Cloudflare IP 的智能识别和处理
- 新增配置选项,可指定特定域名走 Worker 代理
- 改进了错误处理和日志记录
- 没有依赖任何第三方软件
- 可以不设置`proxyip`和`proxyport`, Cloudflare IP 会自动走本地网络

### 使用方法

1. 修改`worker.js`中的`passwd`变量,然后部署到 Cloudflare Worker

2. 部署完成后,在 Cloudflare Worker 中获取到域名和 Worker ID

3. 在本地创建或修改`config.json.example`配置文件,然后重命名为`config.json`:

```json
{
  "domain": "your-worker-domain.example.com",
  "psw": "your-password",
  "sport": 1080,
  "sbind": "127.0.0.1",
  "wkip": "",
  "wkport": "",
  "proxyip": "",
  "proxyport": "",
  "cfhs": ["example.com", ""]
}
```

- `psw`: 与 Worker 中设置的密码一致(必填)
- `sport`: 本地 SOCKS5 代理端口(必填)
- `sbind`: 本地绑定地址,通常为 127.0.0.1(必填)
- `wkip`: 指定连接 Worker 的 IP(可选)
- `wkport`: 指定连接 Worker 的端口(可选)
- `proxyip`: 指定未被屏蔽的 Cloudflare IP(可选)
- `proxyport`: 指定未被屏蔽的 Cloudflare IP 端口(可选)
- `cfhs`: 指定强制走 Worker 代理的域名列表(可选)

4. 运行程序 `node cli.js`,本地会开启 SOCKS5 代理服务

5. 配置浏览器或其他应用程序使用该代理

### 推荐

Windows 用户可使用 Proxifier 为指定程序强制使用代理

### 许可证

MIT License
