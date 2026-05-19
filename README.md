# DN Running Coach

DN Running Coach 是一个面向个人长期使用的跑步 AI 助手 MVP。它计划部署在 NAS 上，由 OpenClaw 负责微信 / QQ 对话入口，服务本身负责 Daniels 训练规则、结构化记忆、手动活动记录和训练建议生成。

当前版本已经实现了一个本地 TypeScript HTTP 服务，可供 OpenClaw 调用。

## 已实现能力

- Daniels 风格的每日训练建议
- 根据熬夜、疲劳、加班、篮球、下肢力量等因素降级训练
- 手动记录篮球、力量、出差、疼痛、熬夜等非手表活动
- 用户训练档案初始化和更新
- 跑后复盘服务雏形
- 周总结服务雏形
- COROS Provider 抽象，后续可接真实 COROS MCP
- SQLite 本地持久化
- OpenClaw 可调用的 HTTP 接口

## 技术栈

- Node.js 24+
- TypeScript
- Fastify
- Zod
- Vitest
- Node 内置 `node:sqlite`

说明：当前 SQLite 使用 Node.js 24 的内置 `node:sqlite`，启动或测试时可能出现 ExperimentalWarning，这是 Node 当前状态导致的警告，不影响 MVP 使用。

## 项目结构

```text
src/
  domain/       Daniels 规则、每日建议、跑后复盘、总结逻辑
  providers/    COROS 数据源抽象
  routes/       OpenClaw 调用的 HTTP 路由
  storage/      SQLite 数据库和 repository
  templates/    微信 / QQ 友好的消息格式
tests/          单元测试和路由测试
docs/           产品设计、部署设计和 OpenClaw 接口文档
```

## 本地运行

安装依赖：

```bash
npm install
```

运行测试：

```bash
npm test
```

构建：

```bash
npm run build
```

启动服务：

```bash
npm run dev
```

默认监听：

```text
http://0.0.0.0:8787
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

期望返回：

```json
{"ok":true,"service":"running-coach"}
```

## NAS 部署建议

推荐在 NAS 上以 Node 服务或 Docker 容器形式常驻运行。第一版最简单的方式是直接用 Node 运行。

### 1. 准备目录

建议在 NAS 上准备持久化目录：

```text
/data/running-coach/
  events/
  backups/
  logs/
```

其中 SQLite 数据库建议放在：

```text
/data/running-coach/events/running-coach.sqlite
```

### 2. 配置环境变量

Linux / NAS shell：

```bash
export RUNNING_COACH_DATA_DIR=/data/running-coach
export RUNNING_COACH_DB=/data/running-coach/events/running-coach.sqlite
export HOST=0.0.0.0
export PORT=8787
```

Windows PowerShell：

```powershell
$env:RUNNING_COACH_DATA_DIR="D:\data\running-coach"
$env:RUNNING_COACH_DB="D:\data\running-coach\events\running-coach.sqlite"
$env:HOST="0.0.0.0"
$env:PORT="8787"
```

### 3. 安装和启动

```bash
npm install
npm run build
npm start
```

如果你想用进程管理器常驻运行，可以使用 NAS 自带任务管理器、systemd、PM2 或 Docker。MVP 阶段建议先用 NAS 的任务管理器或 PM2。

PM2 示例：

```bash
npm install -g pm2
pm2 start dist/index.js --name dn-running-coach
pm2 save
```

## 首次初始化

服务启动后，先创建用户档案。下面示例使用 `default` 作为单用户 ID：

```bash
curl -X POST http://127.0.0.1:8787/coach/profile \
  -H "Content-Type: application/json" \
  -d '{
    "id": "default",
    "goalRace": "10K",
    "goalTimeSeconds": 2700,
    "currentVdot": 45,
    "injuryNotes": [],
    "preferredTrainingDays": ["Tue", "Thu", "Sun"],
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }'
```

字段说明：

- `goalRace` 可选：`5K`、`10K`、`HALF_MARATHON`、`MARATHON`、`HEALTH`
- `goalTimeSeconds` 是目标成绩秒数，例如 10K 45 分钟就是 `2700`
- `currentVdot` 是当前 Daniels VDOT 估计值
- `injuryNotes` 记录受伤史或限制
- `preferredTrainingDays` 记录常用训练日

## OpenClaw 接入方式

OpenClaw 侧可以把微信 / QQ 消息解析后转成 HTTP 请求调用本服务。

推荐架构：

```text
微信 / QQ
  -> OpenClaw on NAS
  -> DN Running Coach HTTP Service
  -> SQLite 结构化记忆
  -> COROS MCP Adapter
```

### 每日建议

OpenClaw 收到“今天怎么练？”后，可以调用：

```bash
curl -X POST http://127.0.0.1:8787/coach/daily-advice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "date": "2026-05-19",
    "availableMinutes": 45,
    "sleepQuality": "poor",
    "fatigue": "high",
    "hasOvertime": true
  }'
```

返回中包含：

- `message`：适合微信 / QQ 直接发送的中文建议
- `advice`：结构化训练建议

### 手动记录篮球或力量

用户说“刚打了 90 分钟篮球，强度很大，小腿有点紧”时，OpenClaw 可以调用：

```bash
curl -X POST http://127.0.0.1:8787/coach/manual-event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default",
    "event": {
      "type": "basketball",
      "occurredAt": "2026-05-19T12:00:00.000Z",
      "durationMinutes": 90,
      "intensity": "hard",
      "lowerBodyLoad": "high",
      "notes": "小腿紧",
      "affectsNextRun": true
    }
  }'
```

之后再问“今天怎么练”，系统会把篮球负荷纳入判断，通常会把质量课降级为 E 跑。

## HTTP 接口

详细接口见：

- `docs/openclaw-agent-contract.md`

当前主要接口：

- `GET /health`
- `POST /coach/profile`
- `POST /coach/manual-event`
- `POST /coach/daily-advice`

## COROS MCP 状态

当前代码已经预留 `CorosProvider` 抽象，但还没有接真实 COROS MCP。第一版可以先通过手动事件和本地档案跑通 OpenClaw 对话闭环。

后续接入 COROS MCP 时，建议新增一个真实 Provider，实现：

```ts
getRecentRuns(userId: string, days: number)
```

然后把每日建议、跑后复盘和周总结接到真实训练记录。

## 备份建议

请定期备份：

```text
/data/running-coach/events/running-coach.sqlite
```

如果未来扩展出更多摘要文件，也建议一并备份：

```text
/data/running-coach/summaries/
/data/running-coach/backups/
```

## 开发命令

```bash
npm test
npm run build
npm run dev
npm run dev:watch
```

## 下一步计划

- 接入真实 COROS MCP
- 实现完整初始化评估：读取近期数据 + 目标成绩 + VDOT 估算
- 增加跑后复盘 HTTP 接口
- 增加周 / 月 / 周期总结 HTTP 接口
- 增加 Daniels VDOT 配速表或官方计算器适配
- 增加 OpenClaw 微信 / QQ 消息解析模板
