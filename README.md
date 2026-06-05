# 世界杯预测机：2026 世界杯胜平负预测与赛事模拟 Skill

[English](README.en.md)

## 在线预测网站

基于本 Skill 开发的世界杯预测网站已上线：[https://world-cup.justidea.cn/](https://world-cup.justidea.cn/)。

网站内容会随比赛进程实时更新，可直接查看冠军概率、单场预测、小组出线、淘汰赛路径和足彩清单等结果。

![世界杯预测台线上网站截图](assets/screenshots/world-cup-predictor-console.png)

世界杯预测机是一个面向 Codex、Claude Code 等 Agent 环境的世界杯预测 Skill。它使用离线审计快照和内置确定性核心，完成 2026 世界杯预测、世界杯胜平负预测、冠军概率模拟，以及中国足球彩票 3/1/0 娱乐参考清单整理。

**一句话**：把审计过的比赛数据交给 Agent，它会告诉你一场球 90 分钟更可能胜、平还是负，也能推演整届世界杯谁更有机会夺冠。
**适合**：想赛前看看一场世界杯怎么判断、想做 2026 世界杯模拟器、想解释冠军概率，或想把胜平负分析接进 Codex / Claude Code 的人。
**不做**：不内置官方数据包、不自动抓取实时比分、新闻、赔率或官方数据；不提供购彩建议、收益承诺或任何官方背书。
**注意**：安装和内部调用名仍是 `worldcup-predictor`，中文显示名和日常提示词可以用「世界杯预测机」。

2026 世界杯采用 48 队、12 个小组、104 场比赛的新赛制。本项目只处理经过审计的离线数据，不依赖 Next.js、数据库、在线抓取或大模型计算概率。LLM 只能解释结果，不能替代规则与概率计算。

## 30 秒开始

使用支持 Agent Skills 的安装工具：

```bash
npx skills add https://github.com/qqyule/worldcup-predictor-skill --skill worldcup-predictor
```

也可以手动安装：

```bash
git clone https://github.com/qqyule/worldcup-predictor-skill.git ~/.codex/skills/worldcup-predictor
```

Claude Code 用户可以将仓库克隆到 `~/.claude/skills/worldcup-predictor`。

安装后可以直接用更自然的话对 Agent 说：

```text
使用世界杯预测机，法国对巴西谁更可能赢？
使用世界杯预测机，帮我看这场球 90 分钟胜平负。
使用世界杯预测机，这场有没有冷门可能？
使用世界杯预测机，给我几个最可能的比分。
使用世界杯预测机，模拟一下 2026 世界杯冠军概率。
使用世界杯预测机，哪些队最可能进八强？
使用世界杯预测机，这个小组谁更可能出线？
使用世界杯预测机，按现在赛果继续推演淘汰赛。
使用世界杯预测机，帮我解释一下为什么模型看好这支队。
使用世界杯预测机，我有 14 场 JSON，整理一份 3/1/0 娱乐参考。
使用世界杯预测机，给我一份偏稳的胜平负清单，注意不是购彩建议。
使用世界杯预测机，把这期比赛按风险高低分一下。
```

## 能力

- 审计结构化离线输入，拒绝不完整或混合版本数据。
- 输出单场 90 分钟胜、平、负概率、预期进球和高概率比分。
- 从已完成赛果继续模拟 2026 世界杯，不覆盖已确认结果，适合做世界杯模拟器或赛程推演。
- 输出小组出线、淘汰赛路径与世界杯冠军概率。
- 基于 `90minResult` 生成中国足球彩票 3/1/0 娱乐参考清单。
- 保持 `90minResult` 与 `advanceResult` 严格分离。
- 过滤未经人工审核的 LLM 临场调整。

## 不适合

- 实时比分、新闻、赔率或官方数据抓取。
- 真实购彩、代购、支付、返利或收益承诺。
- 将淘汰赛晋级概率当作 90 分钟胜率。
- 使用 LLM 编造缺失数据或直接计算概率。
- 使用未授权 FIFA 标识、球队队徽或商业数据资产。

## 命令行示例

需要 Node.js 20 或更高版本，不需要安装依赖。

```bash
# 单场预测
node scripts/predict-match.mjs \
  --data assets/sample-data/worldcup-2026.json \
  --home MEX \
  --away KOR

# 赛事模拟
node scripts/simulate-tournament.mjs \
  --data assets/sample-data/synthetic-48-team.json \
  --simulations 10000 \
  --seed 2026

# 3/1/0 娱乐参考清单
node scripts/generate-lottery-slip.mjs \
  --issue assets/sample-data/lottery-issue.json \
  --strategy balanced \
  --budget 288
```

所有命令向标准输出写入 JSON，适合 Agent、脚本或其他应用继续处理。

## 输入与模型边界

CLI 只接受经过审计的离线 JSON 快照。输入必须包含一致的数据版本、完整的球队强度版本和可验证的已完成赛果。

重要口径：

- `90minResult`：90 分钟含伤停补时结果，只用于胜平负预测、小组积分和 3/1/0 清单。
- `advanceResult`：加时或点球后晋级结果，只用于淘汰赛路径与冠军概率。
- `officialFacts`、天气、新闻和名单默认只用于审计与解释。
- 只有 `manual_review` 或带版本号的 `deterministic_rule` 调整可以影响计算。

详细格式与方法见：

- [`references/data-schema.md`](references/data-schema.md)
- [`references/official-data-sources.md`](references/official-data-sources.md)
- [`references/model-methodology.md`](references/model-methodology.md)
- [`references/tournament-rules.md`](references/tournament-rules.md)
- [`references/lottery-rules.md`](references/lottery-rules.md)

## 仓库结构

```text
.
├── SKILL.md                 # Agent 工作流入口
├── agents/openai.yaml       # Codex UI 元数据
├── core/                    # prediction-core 的确定性 ESM 快照
├── scripts/                 # 审计、预测、模拟与清单 CLI
├── references/              # 数据、模型、赛制与合规规则
├── assets/official-sources.json # 轻量官方来源索引，不含官方数据
├── assets/sample-data/      # 合成烟测数据，不是官方数据源
├── tests/                   # 独立运行测试
├── README.md                # 中文说明
├── README.en.md             # English documentation
└── LICENSE                  # MIT
```

## 开发与验证

```bash
npm test
npm run smoke
```

- `npm test` 验证输入审计、结果口径、已完成赛果锁定、核心清单哈希和独立 CLI。
- `npm run smoke` 使用内置样例运行三个 CLI。
- `core/` 是由上游 `packages/prediction-core` 确定性生成的快照，请不要手动修改。

本仓库的样例数据仅用于功能演示和测试，不代表官方赛程、真实球队实力或实际预测结论。`assets/official-sources.json` 只记录来源元数据，不包含官方抓取结果、CSV、图片、PDF 或实时 feed。

## 开源与贡献

欢迎提交 Issue 或 Pull Request，尤其是：

- 可复现的赛制或输入校验问题；
- 跨 Agent 安装与使用兼容性；
- 不改变概率口径的文档与测试改进。

涉及概率公式、赛制规则或 3/1/0 口径的修改，必须附带确定性测试，并说明对 `90minResult` 与 `advanceResult` 的影响。

## 免责声明

本工具仅提供基于公开数据和数学模型的赛事分析、模拟结果和清单整理，不构成任何购彩、投资或收益建议。请遵守当地法律法规，理性参与中国体育彩票，未成年人禁止参与。

## License

[MIT](LICENSE)
