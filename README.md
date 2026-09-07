# 奇门遁甲 (Qimen Dunjia)

开源奇门遁甲排盘与解盘系统 — 面向初学者的学习与实践平台。

## 特性

- **时家奇门排盘** — 拆补法/置闰法定局，转盘（活盘）模式
- **四层盘叠加** — 地盘、天盘（九星）、人盘（八门）、神盘（八神）完整呈现
- **规则解盘** — 自动生成结构化文字解读（值符值使、格局、十干克应、门加宫/干、综合判断）
- **用神分析** — 8种事类模板（婚姻、求财、考试、出行、疾病、官讼、求职、失物），自动定位用神并分析生克关系
- **格局判断** — 自动识别吉格凶格（龙遁、虎遁、青龙返首等）
- **十干克应** — 81种天地盘干组合的详细解读
- **八门克应** — 门加宫（64组）、门加三奇六仪（72组）、门加门（64组）
- **AI 辅助解盘** — Gemini（免费）和 Claude API（付费）双引擎
- **古籍阅读** — 《烟波钓叟歌》等经典全文搜索
- **知识百科** — 十干克应、格局速查、八门克应的交互式查阅（列表+矩阵视图）

## 技术栈

- **框架:** Next.js 16 (App Router) + TypeScript
- **UI:** React 19 + Tailwind CSS + CSS Variables
- **动画:** Framer Motion
- **日历:** lunar-javascript（农历/节气计算）
- **AI:** Gemini API（免费默认）+ Claude API（付费可选）
- **测试:** Vitest 4
- **部署:** Vercel

## 项目结构

```
qimen-dunjia/
├── app/                          # Next.js 页面
│   ├── page.tsx                  # 首页（问事起盘 / 手动排盘）
│   ├── api/
│   │   ├── interpret/            # Claude API 代理
│   │   └── interpret-hf/         # Gemini API 代理
│   ├── classics/                 # 古籍阅读
│   └── encyclopedia/             # 知识百科（十干克应/格局/八门克应）
├── components/
│   ├── QimenBoard/               # 九宫格盘面（NinePalaceGrid, PalaceCell）
│   ├── InputForm/                # 排盘输入（QuestionInput, ChartForm）
│   ├── Interpretation/           # 解盘展示
│   │   ├── RuleInterpretation    # 规则解盘文字
│   │   ├── YongShenPanel         # 用神分析
│   │   ├── InterpretationPanel   # 数据面板（克应/格局/旺衰）
│   │   └── AiPanel               # AI 解盘
│   ├── Encyclopedia/             # 百科组件（GanInteraction/GateInteraction/Pattern）
│   ├── Classics/                 # 古籍阅读器
│   └── common/                   # 导航、主题
├── lib/
│   ├── qimen/                    # 排盘算法引擎
│   │   ├── constants.ts          # 天干地支九宫八门九星八神常量
│   │   ├── calendar.ts           # 节气/三元/局数计算（拆补法+置闰法）
│   │   ├── algorithm.ts          # 排盘主算法（地天人神四盘）
│   │   ├── types.ts              # TypeScript 类型定义
│   │   └── interpretation/       # 解盘引擎
│   │       ├── interpreter.ts    # 主函数（克应/格局/旺衰/门宫/门干）
│   │       ├── textGenerator.ts  # 规则解盘文字生成
│   │       ├── yongShenAnalysis.ts # 用神分析引擎
│   │       └── data/             # 数据层（单一数据源）
│   │           ├── ganInteractions.ts   # 十干克应（81组）
│   │           ├── gateInteractions.ts  # 八门克应（208组）
│   │           ├── gateWuxing.ts        # 八门五行/旺衰
│   │           ├── yongShen.ts          # 用神模板（8事类）
│   │           ├── patternsAuspicious.ts   # 吉格
│   │           └── patternsInauspicious.ts # 凶格
│   ├── ai/                       # AI prompt 构造
│   └── classics/                 # 古籍文本数据
├── hooks/                        # React Hooks（API Key 管理等）
└── tests/                        # 单元测试
```

## 算法说明

### 排盘流程

1. **定局** — 根据节气确定上中下三元，结合阴遁/阳遁确定局数
   - 拆补法：找符头（最近的甲/己日），按地支分类定三元
   - 置闰法：从节气日算符头，按天数定三元
2. **地盘** — 三奇六仪按固定顺序布入九宫
3. **天盘** — 值符（当值九星）随时干旋转
4. **人盘** — 值使（当值八门）随时干旋转
5. **神盘** — 八神随值符旋转

### 解盘流程

1. **十干克应** — 天盘干+地盘干组合查表（81组）
2. **格局判断** — 吉格/凶格模式匹配
3. **八门旺衰** — 门五行与季节五行的生克关系
4. **门加宫** — 门五行与宫五行的生克（64组）
5. **门加干** — 门与天盘三奇六仪的组合（72组）
6. **用神分析** — 按事类定位用神，分析宫位关系
7. **综合评分** — 阈值评分系统（适配数据基线分布）

### 关键决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 排盘类型 | 时家奇门 | 以时辰为单位起局 |
| 定局法 | 拆补法（默认）/ 置闰法 | 用户可选 |
| 盘式 | 转盘 | 星门神随宫位旋转 |
| 数据架构 | 单一数据源 | 百科与解盘共用数据文件 |
| AI | 双引擎 | Gemini（免费）+ Claude（付费） |

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 开发计划

详见 [PLAN.md](./PLAN.md)

## License

MIT
