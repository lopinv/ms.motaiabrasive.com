# MoTai Abrasives — 马来语站点

Hubei MoTai Abrasives Materials Co., Ltd. 的马来语（Bahasa Melayu）企业级工业 B2B 站点。纯静态构建，部署于 GitHub Pages，生产域名为 `https://ms.motaiabrasive.com`。

## 项目简介

网站面向马来西亚/马来西亚语市场的工业采购商、进口商与经销商，覆盖五个产品族（磨料带、百叶片、网布砂碟、Hook & Loop、砂海绵）、七个应用行业（木材加工、金属加工、汽车与维修、船舶与海洋维护、石油天然气、建筑材料加工、通用工业）以及质量、资源与询价转化路径。

站点在构建时会自动校验 SEO 元数据、JSON-LD 结构、页面内容厚度、内部链接图与 Sitemap 完整性，防止出现薄内容页与孤岛页面。

## 技术栈

- [Astro](https://astro.build/) 7.x — 静态站点生成
- TypeScript（strict）
- `@astrojs/sitemap` — 自动生成 Sitemap
- 原生 CSS（设计令牌 + CSS 逻辑属性，LTR 布局）
- 无前端框架，无运行时依赖

## 环境要求

- Node.js 22 或更高版本（CI 使用 22）
- npm 11 或更高版本

## 快速开始

```bash
npm ci
npm run dev        # 本地开发，默认 http://localhost:4321
npm run build      # 类型检查 + 静态构建，输出到 dist/
npm run preview    # 本地预览构建产物
npm run check      # Astro 类型检查 + 站点质量检查
npm run check:site # 仅运行 SEO/内容/内链检查（需先 build）
```

## 目录结构

```text
src/
├── components/   # 导航、页脚、面包屑、CTA、表单与 FAQ 组件
├── data/site.ts  # 企业资料、产品、行业、质量流程与资源内容
├── layouts/      # BaseLayout（元数据/JSON-LD）与 Layout（页面骨架）
├── pages/        # 全部静态路由
└── styles/       # 设计令牌、组件样式、页面样式
public/
├── images/       # 公开产品与工厂图片
└── favicon.svg
scripts/
└── quality-check.mjs  # SEO、内容厚度、内链与 Sitemap 自动检查
```

## 页面与内容策略

| 类型 | 路由 | 内容要求 |
| --- | --- | --- |
| 首页 | `/` | Hero、产品入口、企业能力、行业方案、流程、FAQ |
| 产品目录 | `/products` | 5 个产品族入口 + 选型引导 |
| 产品详情 | `/products/[slug]` | 用途、选型要点、规格表、FAQ、相关产品、询价入口 |
| 行业目录 | `/industries` | 7 个行业场景 + 挑战清单 |
| 行业详情 | `/industries/[slug]` | 挑战、选型步骤、推荐产品、FAQ、相邻行业 |
| 企业/质量 | `/company`、`/quality` | 能力、流程、检查清单、FAQ |
| 资源中心 | `/resources`、`/resources/[slug]` | 技术指南与采购准备清单 |
| 转化 | `/quote`、`/contact` | 分步询价表单、WhatsApp、邮箱、电话 |
| 合规 | `/privacy` | 数据收集、使用、保留与权利说明 |

**防孤岛规则**：每个可索引页面必须至少有一条来自站内其他页面的上下文入链（导航、面包屑、正文链接或相关推荐）。`scripts/quality-check.mjs` 会解析构建产物中的真实链接并阻断孤岛页面。

**内容发布门槛**：资料不足的页面不生成可索引路由；不虚构认证、客户案例、性能数据或库存。

## SEO 与结构化数据

- 每页唯一 Title、Meta Description、单 H1、Canonical、OGP 与 Twitter 卡片
- JSON-LD：`Organization`、`WebSite`、`BreadcrumbList`、`Product`、`FAQPage`
- 自动生成 `sitemap-index.xml` 与 `robots.txt`（指向生产域名）
- `Product` 结构化数据仅填充可核验字段，不写入虚假价格、库存或评分
- 语言标记：`lang="ms"`、`og:locale=ms_MY`、`hreflang="ms"`、JSON-LD `inLanguage="ms"`

## 表单与 WhatsApp

询价表单通过 [FormSubmit](https://formsubmit.co/) 提交到 `motai-01@motaiabrasive.com`，静态托管无需服务端。若更换 CRM 或表单服务，只需修改 `src/pages/quote.astro` 中的表单 `action`。

WhatsApp 号码为 `+86 181 1863 5597`（来自企业官网公开信息），统一在 `src/data/site.ts` 中维护。产品页的 WhatsApp 链接会预填产品名与询价话术。

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库并推送本项目。
2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 推送至 `main` 分支，`.github/workflows/deploy.yml` 会自动执行 `npm ci` → 构建与检查 → 上传 `dist/` → 发布。
4. 若使用自定义域名 `ms.motaiabrasive.com`，在 **Settings → Pages → Custom domain** 中填写，并为该域名添加 DNS `CNAME` 记录指向 `<user>.github.io`（`public/CNAME` 已写入该域名）。

`astro.config.mjs` 中的 `site` 已配置为 `https://ms.motaiabrasive.com`，Canonical 与 Sitemap 均基于此域名生成。

## 业务资料待补充

以下内容需要企业方提供真实资料后替换，当前仅使用官网可核验的公开信息：

- 可公开的认证证书与编号
- 客户案例与参考项目
- 完整产品型号库与扩展规格（GXK-51、XZ-330、GPC71、Y399、MT-32、Y999 等）
- 目标市场的合规与标签要求
- 正式的询价收件服务（若不使用 FormSubmit）

## 贡献流程

1. 在功能分支开发：`type/developer/description`
2. 本地执行 `npm run check` 确保类型与站点质量检查通过
3. 提交信息遵循 `<type>(<scope>): <subject>`，涉及逻辑变更时补充 Body 说明原因
4. 推送后由 GitHub Actions 自动构建并部署 Pages
