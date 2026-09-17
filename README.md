# Robot Guide

机器人本体、机械臂和末端执行器的供应链资料与场景选型库。

当前重点场景是工厂线束布线、捋线和接插件装配。移动本体需要保持机身朝向完成横向平移，因此“全向移动/蟹行”作为首轮硬门槛。

## 目录

- `data/robots.csv`：本体和双臂模块的结构化参数主表。
- `data/scenario_scores.csv`：布线捋线场景评分。
- `data/score_weights.csv`：可调整的评分权重。
- `data/questions.csv`：供应商待确认问题和POC验收项。
- `data/sources.csv`：参数来源、版本和可信度。
- `data/images.csv`：型号图示、本地文件和图片来源索引。
- `docs/comparison.md`：当前对比结论。
- `docs/methodology.md`：字段、评分和更新规则。
- `docs/vendors/`：供应商层面的记录。
- `outputs/机器人本体产品主表.xlsx`：面向评审的工作簿，由结构化数据生成。
- `sources/raw/`：供应商原始文件，按原目录归档；PDF 使用 Git LFS 管理。

## 已纳入范围

当前已纳入 18 个本体或双臂模块，包括智元、千寻智能、星尘、智动力、宇树、天机智能、波士顿动力、Figure AI、Tesla、逐际动力、星海图和它石智航。新增重点产品为：

- Boston Dynamics Atlas
- Figure 03
- Tesla Optimus
- 逐际动力 LimX Oli EDU、TRON 2 双臂形态
- 星海图 Galaxea R1 Pro 2026
- 它石智航 TARS A1
- 千寻智能 Moz1 Pro

## 各家本体对比结果

以工厂布线、捋线和接插件装配为目标，当前建议分层如下：

图片与型号、评分和结论按行对应。图示仅用于型号识别，不表示尺寸比例或最终交付配置；来源见 [`data/images.csv`](data/images.csv)。

| 图示 | 排名 | 本体 | 综合分 | 横移门槛 | 当前结论 |
|---|---:|---|---:|---|---|
| <img src="docs/assets/models/agibot-g2.png" alt="智元精灵 G2" width="135"> | 1 | **智元精灵 G2** | **4.60** | 通过 | **优先 POC**；全向、工作空间和量化力控最均衡，验证移动后整链路精度。 |
| <img src="docs/assets/models/galaxea-r1-pro.jpg" alt="星海图 R1 Pro 2026" width="135"> | 2 | **星海图 R1 Pro 2026** | **4.10** | 通过 | **条件 POC**；底盘和工作空间合适，主要风险是 ±0.5 mm 和机械臂无制动器。 |
| <img src="docs/assets/models/spirit-moz1-pro.jpg" alt="千寻智能 Moz1 Pro" width="135"> | 3 | **千寻智能 Moz1 Pro** | **3.93** | 通过待实测 | **条件 POC**；SDK确认横移，公开力控接口、Pro专属手册和连续运行证据不足。 |
| <img src="docs/assets/models/boston-atlas.jpg" alt="Boston Dynamics Atlas" width="135"> | 4 | **Boston Dynamics Atlas** | 3.85 | 双足待实测 | 技术标杆；工业能力强，但采购、国内交付和接口开放性不足。 |
| <img src="docs/assets/models/figure-03.jpg" alt="Figure 03" width="135"> | 5 | **Figure 03** | 3.80 | 双足待实测 | 技术标杆；触觉和量产设计突出，无公开工业SDK。 |
| <img src="docs/assets/models/zdl-d1.jpg" alt="智动力 D1" width="135"> | 6 | **智动力 D1** | 3.80 | 通过待实测 | 条件 POC；四轮四转、负载高，但约300 kg且精度、力控证据不足。 |
| <img src="docs/assets/models/tars-a1.jpg" alt="它石 TARS A1" width="135"> | 7 | **它石 TARS A1** | 3.65 | 待确认 | 专项尽调；线束任务证据最强，本体规格和规模部署验收数据不透明。 |
| <img src="docs/assets/models/limx-oli-edu.jpg" alt="逐际动力 Oli EDU" width="135"> | 8 | **逐际动力 Oli EDU** | 3.35 | 双足待实测 | 开发平台；工具链开放，工业精度和可靠性不足。 |
| <img src="docs/assets/models/astribot-t1.jpg" alt="星尘 Astribot T1" width="135"> | 9 | **星尘 Astribot T1** | 3.20 | 待确认 | 补齐资料；量产和柔性突出，轮系、精度和SDK指标未完整披露。 |
| <img src="docs/assets/models/limx-tron2.jpg" alt="逐际动力 TRON 2 双臂形态" width="135"> | 10 | **逐际动力 TRON 2 双臂形态** | 3.20 | 待确认 | 开发平台；“四向移动”尚不能等同保持朝向纯横移。（第三方识别图） |
| <img src="docs/assets/models/tesla-optimus.jpg" alt="Tesla Optimus" width="135"> | 11 | **Tesla Optimus** | 2.80 | 待确认 | 持续观察；缺少可采购工程规格和第三方集成方式。（第三方识别图） |
| <img src="docs/assets/models/unitree-g1d.jpg" alt="宇树 G1-D 旗舰版" width="135"> | 12 | **宇树 G1-D 旗舰版** | 2.30 | 不通过 | 差速底盘不能纯横移，更适合数据采集和开发。 |
| <img src="docs/assets/models/zdl-juno2-sd.jpg" alt="智动力 JUNO2-SD" width="135"> | 13 | **智动力 JUNO2-SD** | 2.15 | 不通过 | 差速底盘不满足当前布线移动硬门槛。 |

## 核心候选参数

| 本体 | 移动结构 | 单臂负载 / 臂展 | 重复定位 | 力控与接口 | 主要风险 |
|---|---|---|---|---|---|
| 智元精灵 G2 | 四舵轮全向，1.5 m/s | 5 kg / 696 mm | 0.1 mm | 全关节力矩监测，0.02 Nm、5 kHz；CAN-FD、RS485、1G/10G网口 | 整机移动后的TCP精度仍需验证 |
| 星海图 R1 Pro 2026 | 三舵轮360°全向，1.5 m/s | 额定3.5 kg、峰值5 kg / 620 mm | ±0.5 mm | 力传感选配；USB、千兆网、Wi-Fi 6 | 精密插接精度和断电下坠 |
| 千寻智能 Moz1 Pro | 全向轮，稳定1.0 m/s | 5 kg / 700 mm | 标称±0.05 mm | ROS 2/Python、最高120 Hz；CAN、RS485、2.5GbE | 外部力控未开放，Pro资料与旧手册存在冲突 |
| 智动力 D1 | 四轮四转，1.5 m/s | 额定15 kg、峰值25 kg / 1000 mm | 未公开 | ROS/Python、EtherCAT、CAN、UART | 约300 kg，精度和力控未量化 |
| 它石 TARS A1 | 轮式，轮系未公开 | 未公开 | 有亚毫米任务纪录 | SDK与末端接口未公开 | 展示纪录不能替代规模部署验收 |
| 星尘 Astribot T1 | 紧凑轮式，轮系未公开 | 5 kg / 未公开 | 未公开 | 可换末端与算力背包，协议未公开 | 蟹行、精度、力控和工业认证待确认 |

完整参数、型号图示、证据分级和逐项风险见 [`docs/comparison.md`](docs/comparison.md)。评分仅用于采购前筛选，不替代现场 POC；底盘横移、视觉重定位、末端夹爪、力控、断电安全和连续运行必须使用真实线束验证。

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

供应商 PDF、开发手册和原始索引统一存放在 `sources/raw/`，尽量保留供应商与产品层级。PDF 使用 Git LFS，便于后续更新大文件；每份材料同时登记到 `data/sources.csv`，对比结论应能追溯到具体文件或官方页面。
