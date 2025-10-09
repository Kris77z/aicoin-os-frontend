# 项目管理系统 - 前端

基于 [Next.js](https://nextjs.org) 构建的现代化项目管理系统前端应用，专为团队协作和项目跟踪而设计。

## 🚀 功能特性

### 核心模块

- **🏠 项目概览** - 全局项目状态和数据统计仪表板
- **📋 任务看板** - 拖拽式Kanban看板，支持任务状态管理和团队协作
- **🐛 Issues管理** - 完整的Issue生命周期管理，从创建到完成
- **👥 人员管理** - 团队成员信息管理和权限控制

### 技术亮点

- **⚡ 现代化技术栈**: Next.js 14 + TypeScript + Tailwind CSS
- **🎨 优雅UI设计**: 基于shadcn/ui组件库，响应式设计
- **📊 实时数据**: GraphQL API集成，支持实时数据更新
- **🔍 智能搜索**: 全局搜索功能，支持多字段模糊匹配
- **🏷️ 标签系统**: 灵活的标签分类和筛选机制
- **📱 移动端适配**: 完全响应式设计，支持移动设备访问

## 🛠️ 技术架构

### 前端技术栈

```
Next.js 14 (App Router)
├── TypeScript - 类型安全
├── Tailwind CSS - 样式框架
├── shadcn/ui - UI组件库
├── Lucide React - 图标库
├── React Hook Form - 表单管理
└── GraphQL - API通信
```

### 项目结构

```
src/
├── app/                    # App Router页面
│   ├── issues/            # Issues管理模块
│   ├── kanban/            # 任务看板模块
│   ├── personnel/         # 人员管理模块
│   └── globals.css        # 全局样式
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   └── layout/           # 布局组件
├── lib/                  # 工具库和API
├── types/               # TypeScript类型定义
└── hooks/              # 自定义React Hooks
```

## 🚀 快速开始

### 环境要求

- Node.js 18.17+ 
- npm / yarn / pnpm / bun

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 后端服务

确保后端GraphQL服务正在运行（默认端口：4000）：

```bash
# 在后端项目目录中
cd ../vibe-project
npm run dev
```

## 📋 功能模块详解

### Issues管理

- **创建Issue**: 支持多种Issue类型（新功能、增强、Bug修复等）
- **状态跟踪**: 待开始 → 进行中 → 审核中 → 已完成
- **优先级管理**: 低、中、高、紧急四个级别
- **人员分配**: 负责人和审核人分配
- **时间规划**: 预计开始日期和完成日期
- **详情页面**: 完整的Issue信息展示和任务拆分

### 任务看板

- **可视化管理**: 直观的Kanban看板界面
- **拖拽操作**: 支持任务状态拖拽更新
- **团队视图**: 按团队成员分组展示任务
- **筛选功能**: 支持版本、优先级、类型筛选
- **实时更新**: 任务状态实时同步

### 人员管理

- **团队成员**: 完整的人员信息管理
- **组织架构**: 部门和上下级关系
- **状态跟踪**: 在职、离职、请假、试用期状态
- **多维搜索**: 姓名、部门、职位多字段搜索
- **详情展示**: 个人信息和工作统计

### 导航与面包屑

- 统一采用顶部 `SiteHeader` 面包屑
- `directory` 显示为“通讯录”，例如：`首页 > 通讯录 > 人员详情`

### 权限与角色显示

- 角色勾选与保存使用后端角色字段名（用于接口）
- 页面展示采用中文名映射（可扩展）：
  - super_admin → 超级管理员
  - admin → 管理员
  - hr_manager → HR管理员
  - project_manager → 主管
  - member → 普通成员

### 字段可见性（两档方案）

- **PUBLIC（公开）**：所有登录用户可见（如姓名、部门、职位、手机号、工作邮箱）
- **CONFIDENTIAL（保密）**：仅管理员和同公司HR可见（如身份证、银行卡、合同、家庭成员）
- 后端权限：
  - `user_confidential:read` - 查看保密字段
  - `export:confidential` - 导出保密字段
- HR只能查看和导出**同公司**员工的保密信息，跨公司不可见

### 已移除功能

- 临时授权（Temporary Access Grant）功能已从导航、页面与 API 中移除；如需恢复，请在 UI 与 `adminApi` 中重新添加相应入口与方法
- 旧三档权限（SENSITIVE/HIGHLY_SENSITIVE）已统一为两档（PUBLIC/CONFIDENTIAL）

## 🎨 设计系统

### 主题配置

- **配色方案**: 专业的企业级配色
- **字体系统**: Geist字体族，优化阅读体验
- **间距规范**: 统一的间距和布局规则
- **响应式断点**: 移动优先的响应式设计

### 组件库

基于shadcn/ui构建的企业级组件库：

- **表单组件**: Input、Select、DatePicker、Editor等
- **数据展示**: Table、Card、Badge、Avatar等  
- **导航组件**: Sidebar、Breadcrumb、Pagination等
- **反馈组件**: Alert、Toast、Modal、Loading等

## 🔧 开发工具

### 代码质量

```bash
# TypeScript类型检查
npm run type-check

# ESLint代码检查
npm run lint

# Prettier代码格式化
npm run format
```

### 构建部署

```bash
# 生产构建
npm run build

# 启动生产服务
npm run start
```

## 📈 项目进展

### ✅ 已完成功能

- [x] 项目基础架构搭建
- [x] UI组件库集成
- [x] GraphQL API集成
- [x] Issues管理完整流程
- [x] 任务看板可视化
- [x] 人员管理模块
- [x] 响应式设计优化
- [x] 搜索和筛选功能

### 🚧 开发中功能

- [ ] 项目概览仪表板
- [ ] 权限管理系统
- [ ] 通知消息中心
- [ ] 高级报表统计
- [ ] 移动端PWA支持

### 📋 计划功能

- [ ] 多语言国际化
- [ ] 暗色主题模式
- [ ] 离线数据缓存
- [ ] 实时协作功能
- [ ] 第三方集成（GitLab、Slack等）

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- 项目负责人: [您的姓名]
- 邮箱: [您的邮箱]
- 项目地址: [GitHub仓库地址]

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
