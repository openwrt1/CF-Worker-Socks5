import { connect } from "cloudflare:sockets";

export default {
  async fetch(request, env, _ctx) {
    // 1. fetch 事件开始
    console.log(`[LOG 1] Received a request for: ${request.url}`);

    const passwd = env.PASSWD || "4056063"; // 从环境变量获取密码
    const upgradeHeader = request.headers.get("Upgrade");

    if (upgradeHeader !== "websocket") {
      console.log(
        "[LOG 2] Request is not a WebSocket upgrade. Serving landing page.",
      );

      const landingPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOCKS5 Proxy Worker</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: auto; max-width: 800px; padding: 2em; line-height: 1.6; color: #333; }
        div { border: 1px solid #ddd; border-radius: 8px; padding: 1em 2em; }
        h1 { color: #000; }
        p { margin-bottom: 10px; }
        code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; }
    </style>
</head>
<body>
    <div>
        <h1>SOCKS5 Proxy Worker Endpoint</h1>
        <p>This is a Cloudflare Worker endpoint designed to function as the server-side component of a SOCKS5 proxy.</p>
        <p>It only accepts <strong>WebSocket</strong> connections from its corresponding client application (e.g., <code>cli.js</code> from the project).</p>
        <p>You cannot use this endpoint directly in your browser. Please use the provided client to establish a SOCKS5 proxy connection.</p>
    </div>
</body>
</html>
`;
      return new Response(landingPageHTML, {
        status: 200, // Use 200 OK for a friendly page
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. 确认是 WebSocket 请求，创建 WebSocketPair
    console.log(
      "[LOG 2] Request is a valid WebSocket upgrade. Creating WebSocket pair.",
    );
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    // 使用一个函数来处理认证和建立管道
    const handleSession = async () => {
      // 3. 等待客户端第一条消息 (认证消息)
      const firstMessage = await new Promise((resolve) => {
        server.addEventListener("message", (event) => resolve(event), {
          once: true,
        });
      });
      console.log("[LOG 3] Received first message from client.");

      try {
        const { hostname, port, psw } = JSON.parse(firstMessage.data);
        // 4. 成功解析 JSON
        console.log(`[LOG 4] Parsed auth data. Target: ${hostname}:${port}`);

        if (passwd !== psw) {
          console.error(
            `[ERROR] Authentication failed. Client psw: ${psw}, Server psw: ${passwd}`,
          );
          throw new Error("Illegal-User");
        }

        // 5. 密码验证通过
        console.log("[LOG 5] Password authentication successful.");

        // 6. 准备连接到目标主机
        console.log(
          `[LOG 6] Attempting to connect to target: ${hostname}:${port}`,
        );
        // 当目标端口是443或其他需要TLS的端口时，必须启用TLS
        // "starttls" 会让 socket 在传输数据前先进行TLS握手
        const socket = connect({ hostname, port, secureTransport: "starttls" });
        console.log("[LOG 7] TCP socket created. Setting up data pipes.");

        // 7. 设置数据管道
        // 将 WebSocket 的消息转发到 TCP socket
        const readableStream = new ReadableStream({
          start(controller) {
            server.onmessage = (event) => {
              console.log("[PIPE] Client -> Worker -> Target");
              controller.enqueue(event.data);
            };
            server.onclose = () => {
              console.log("[PIPE] Client WebSocket closed.");
              controller.close();
            };
            server.onerror = (err) => {
              console.error("[PIPE] Client WebSocket error:", err);
              controller.error(err);
            };
          },
          cancel() {
            console.log("[PIPE] ReadableStream from client canceled.");
            socket.close();
          },
        });

        // 让两个管道在后台独立运行，一个的关闭不影响另一个
        const promise1 = readableStream.pipeTo(socket.writable, { preventClose: true }).catch((err) => {
          console.error("[PIPE ERROR] Client -> Target pipe failed:", err.message);
        });

        const promise2 = socket.readable.pipeTo(new WritableStream({
            write(chunk) {
              console.log("[PIPE] Target -> Worker -> Client");
              server.send(chunk);
            },
            close() {
              console.log("[PIPE] Target -> Client pipe closed (target connection ended).");
            },
            abort(err) {
              console.error("[PIPE] Target -> Client pipe aborted:", err);
            }
        })).catch((err) => {
          console.error("[PIPE ERROR] Target -> Client pipe failed:", err.message);
        });

        // 你可以选择等待它们都完成，但这对于单向请求（如 curl）不是必须的
        // await Promise.all([promise1, promise2]);
        // 对于这个应用场景，让它们在后台运行即可。
        // 函数会继续执行到末尾，但管道会保持活动状态。

      } catch (error) {
        // 8. 捕获到错误
        console.error(`[LOG 8] Caught an error: ${error.message}`);
        server.close(1011, error.message);
      }
    };

    handleSession();

    console.log("[LOG END] Returning WebSocket upgrade response to client.");
    return new Response(null, { status: 101, webSocket: client });
  },
};
