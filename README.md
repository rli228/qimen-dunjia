# 奇门遁甲 (Qimen Dunjia)

开源奇门遁甲排盘与解盘系统 — 面向初学者的学习与实践平台。

## 特性

- **时家奇门排盘** — 拆补法定局，转盘（活盘）模式
- **四层盘叠加** — 地盘、天盘（九星）、人盘（八门）、神盘（八神）完整呈现
- **格局判断** — 自动识别吉格凶格（龙遁、虎遁、青龙返首等）
- **十干克应** — 天地盘干组合的详细解读
- **AI 辅助解盘** — 结合 Claude API 提供智能解读
- **古籍阅读** — 《烟波钓叟歌》等经典全文搜索
- **知识百科** — 八门、九星、八神、格局详解
- **初学者友好** — 教学引导、经典案例库、术语解释

## 技术栈

- **框架:** Next.js 14 (App Router) + TypeScript
- **样式:** Tailwind CSS + CSS Variables（明暗主题）
- **动画:** Framer Motion
- **日历:** lunar-javascript（农历/节气计算）
- **AI:** Claude API（辅助解盘）
- **部署:** Vercel

## 项目结构

```
qimen-dunjia/
├── app/                          # Next.js 页面
│   ├── page.tsx                  # 首页（排盘入口）
│   ├── chart/                    # 排盘结果页
│   ├── interpretation/           # 解盘分析页
│   ├── classics/                 # 古籍阅读
│   ├── encyclopedia/             # 知识百科
│   └── cases/                    # 经典案例库
├── components/                   # React 组件
│   ├── QimenBoard/               # 九宫格盘面
│   ├── InputForm/                # 排盘输入表单
│   ├── Interpretation/           # 解盘展示
│   ├── Classics/                 # 古籍阅读器
│   └── common/                   # 通用组件
├── lib/                          # 核心库
│   ├── qimen/                    # 排盘算法引擎
│   │   ├── constants.ts          # 天干地支九宫八门九星八神常量
│   │   ├── calendar.ts           # 节气/三元/局数计算
│   │   ├── algorithm.ts          # 排盘主算法（地天人神四盘）
│   │   ├── interpretation.ts     # 格局判断与解盘逻辑
│   │   ├── types.ts              # TypeScript 类型定义
│   │   └── famous.ts             # 经典案例数据
│   └── classics/                 # 古籍文本
│       ├── yandunshu.ts          # 烟波钓叟歌
│       ├── qimenbijue.ts         # 奇门秘诀
│       └── shiganjieying.ts      # 十干克应
└── public/                       # 静态资源
```

## 算法说明

### 排盘流程

1. **定局** — 根据节气确定上中下三元，结合阴遁/阳遁确定局数（拆补法）
2. **地盘** — 三奇六仪按固定顺序布入九宫
3. **天盘** — 值符（当值九星）随时干旋转
4. **人盘** — 值使（当值八门）随时干旋转
5. **神盘** — 八神随值符旋转

### 关键决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 排盘类型 | 时家奇门 | 以时辰为单位起局 |
| 置闰法 | 拆补法 | 将一节气拆为上下两部分 |
| 盘式 | 转盘 | 星门神随宫位旋转 |

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

## 开发计划

详见 [PLAN.md](./PLAN.md)

## License

MIT
