# Robot Guide

机器人本体、机械臂和末端执行器的供应链资料与场景选型库。

当前重点场景是工厂线束布线、捋线和接插件装配。移动本体需要保持机身朝向完成横向平移，因此“全向移动/蟹行”作为首轮硬门槛。

## 目录

- `data/robots.csv`：本体和双臂模块的结构化参数主表。
- `data/scenario_scores.csv`：布线捋线场景评分。
- `data/score_weights.csv`：可调整的评分权重。
- `data/questions.csv`：供应商待确认问题和POC验收项。
- `data/sources.csv`：参数来源、版本和可信度。
- `docs/comparison.md`：当前对比结论。
- `docs/methodology.md`：字段、评分和更新规则。
- `docs/vendors/`：供应商层面的记录。
- `outputs/机器人本体产品主表.xlsx`：面向评审的工作簿，由结构化数据生成。
- `sources/private/`：供应商原始文件暂存区，默认不提交Git。

## 当前结论

以布线捋线场景为目标，首版优先级为：

1. 智元精灵G2：四舵轮全向底盘，力控和工程参数最完整，优先进入POC。
2. 星尘Astribot S1：论文确认三自由度全向底盘，操作性能突出，但量产配置和接口资料仍需补齐。
3. 智动力D1：四轮四转并明确支持蟹行，负载高，但整机重、体积大，精度和力控证据不足。
4. 宇树G1-D旗舰版、智动力JUNO系列：差速底盘，不满足保持朝向横向移动的硬门槛。

评分是采购前筛选，不替代现场POC。底盘横移、视觉重定位、末端夹爪、力控和连续运行必须按真实线束验证。

## 更新方式

1. 新资料先登记到 `data/sources.csv`。
2. 参数更新到 `data/robots.csv`，未知值保持为空。
3. 宣传参数、供应商书面确认、合同保证值和实测值分开记录。
4. 新问题加入 `data/questions.csv`，关闭问题时保留结论和日期。
5. 修改CSV后重新生成Excel，并在 `docs/changelog.md` 记录变更。

在已配置 `@oai/artifact-tool` 的 Node.js 环境中执行：

```bash
node scripts/build_workbook.mjs
```

## 原始资料策略

供应商PDF和开发手册可能包含非公开信息。仓库可见性和授权范围未确认前，原始文件不提交；`data/sources.csv` 保留文件名和外部存放位置。确认仓库为私有且允许上传后，再决定是否纳入Git LFS。
