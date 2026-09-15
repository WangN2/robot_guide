import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FileBlob,
  SpreadsheetFile,
  Workbook,
} from "@oai/artifact-tool";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dataDir = path.join(repoRoot, "data");
const outputDir = path.join(repoRoot, "outputs");
const previewDir = path.join(repoRoot, ".tmp", "previews");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

function readCsv(fileName) {
  const text = fs.readFileSync(path.join(dataDir, fileName), "utf8").trim();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function asNumber(value) {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

const robots = readCsv("robots.csv");
const weights = readCsv("score_weights.csv");
const scores = readCsv("scenario_scores.csv");
const questions = readCsv("questions.csv");
const sources = readCsv("sources.csv");

const wb = Workbook.create();
wb.metadata = {
  title: "机器人本体产品主表",
  subject: "工厂布线、装配与精密转移场景的本体对比",
  author: "robot_guide",
  company: "BinClaw",
  comments: "由 data/*.csv 自动生成；评分为当前工程判断，需通过供应商澄清和 POC 持续更新。",
};

const palette = {
  navy: "#17365D",
  blue: "#D9EAF7",
  lightBlue: "#EAF3F8",
  green: "#E2F0D9",
  amber: "#FFF2CC",
  red: "#FCE4D6",
  gray: "#E7E6E6",
  dark: "#1F2937",
  white: "#FFFFFF",
};

const titleFormat = {
  fill: palette.navy,
  font: { bold: true, color: palette.white, size: 15 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

const headerFormat = {
  fill: palette.navy,
  font: { bold: true, color: palette.white, size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};

const subHeaderFormat = {
  fill: palette.blue,
  font: { bold: true, color: palette.dark, size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};

function baseSheet(name) {
  const sheet = wb.worksheets.add(name);
  sheet.showGridlines = false;
  sheet.getRange("A:AZ").format.font = { name: "Arial", size: 10, color: palette.dark };
  return sheet;
}

function writeMatrix(sheet, startCell, values) {
  if (!values.length || !values[0].length) return;
  const start = sheet.getRange(startCell);
  const target = start.resize(values.length, values[0].length);
  target.values = values;
}

function addStatusFormatting(range, passText = "通过", failText = "不通过") {
  range.conditionalFormats.addCustom(`=${range.columnName}1="${passText}"`, {
    fill: palette.green,
    font: { color: "#375623", bold: true },
  });
  range.conditionalFormats.addCustom(`=${range.columnName}1="${failText}"`, {
    fill: palette.red,
    font: { color: "#9C0006", bold: true },
  });
}

// 1. 决策摘要：先结论，后证据。
const summary = baseSheet("决策摘要");
summary.mergeCells("A1:G1");
summary.getRange("A1").values = [["机器人本体决策摘要｜工厂布线 / 捋线场景"]];
summary.getRange("A1:G1").format = titleFormat;
summary.getRange("A1:G1").format.rowHeight = 30;
summary.mergeCells("A3:G3");
summary.getRange("A3").values = [["硬门槛：底盘必须支持保持机身朝向的横移 / 蟹行。差速底盘不能用路径规划等价替代，会增加停顿、摆动和线束扰动。"]];
summary.getRange("A3:G3").format = {
  fill: palette.amber,
  font: { bold: true, color: "#7F6000" },
  wrapText: true,
  rowHeight: 34,
};
summary.getRange("A5:G5").values = [["当前优先级", "厂商", "型号", "综合分", "硬门槛", "建议", "主要判断"]];
summary.getRange("A5:G5").format = headerFormat;

const eligibleScores = scores
  .filter((row) => row.eligible_for_ranking === "是")
  .map((row) => {
    const weighted = weights.reduce((total, weight) => {
      const fieldMap = {
        base: "base_score",
        workspace: "workspace_score",
        force: "force_score",
        precision: "precision_score",
        interface: "interface_score",
        industrial: "industrial_score",
      };
      return total + Number(row[fieldMap[weight.criterion_id]]) * Number(weight.weight);
    }, 0);
    const recommendation = row.crab_gate === "不通过"
      ? "不进入布线 POC"
      : weighted >= 4.2
        ? "优先 POC"
        : weighted >= 3.5
          ? "条件 POC"
          : "补齐资料后再评估";
    return { ...row, weighted, recommendation };
  })
  .sort((a, b) => {
    const gateA = a.crab_gate === "不通过" ? 1 : 0;
    const gateB = b.crab_gate === "不通过" ? 1 : 0;
    return gateA - gateB || b.weighted - a.weighted;
  });

writeMatrix(summary, "A6", eligibleScores.map((row, index) => [
  index + 1,
  row.vendor,
  row.model,
  row.weighted,
  row.crab_gate,
  row.recommendation,
  row.score_note,
]));
summary.getRange(`D6:D${5 + eligibleScores.length}`).format.numberFormat = "0.00";
summary.getRange(`A5:G${5 + eligibleScores.length}`).format.wrapText = true;
summary.getRange(`A6:G${5 + eligibleScores.length}`).format.rowHeight = 32;
summary.getRange(`D6:D${5 + eligibleScores.length}`).conditionalFormats.addColorScale({
  minColor: palette.red,
  midColor: palette.amber,
  maxColor: palette.green,
});
summary.getRange(`E6:E${5 + eligibleScores.length}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"不通过"',
  format: { fill: palette.red, font: { color: "#9C0006", bold: true } },
});
summary.getRange(`E6:E${5 + eligibleScores.length}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"通过"',
  format: { fill: palette.green, font: { color: "#375623", bold: true } },
});
summary.getRange("A:G").format.columnWidth = 12;
summary.getRange("C:C").format.columnWidth = 25;
summary.getRange("F:F").format.columnWidth = 20;
summary.getRange("G:G").format.columnWidth = 54;
summary.freezePanes.freezeRows(5);

const noteRow = 7 + eligibleScores.length;
summary.mergeCells(`A${noteRow}:G${noteRow}`);
summary.getRange(`A${noteRow}`).values = [["说明：综合分不能越过横移硬门槛和供货资格。双足侧步不等同工业蟹行；Atlas、Figure、Optimus 的采购与SDK开放性需单独判断。"]];
summary.getRange(`A${noteRow}:G${noteRow}`).format = {
  fill: palette.lightBlue,
  font: { italic: true, color: palette.navy },
  wrapText: true,
  rowHeight: 32,
};

// 2. 场景评分：权重与公式均在表内可审计。
const scoring = baseSheet("场景评分");
scoring.mergeCells("A1:M1");
scoring.getRange("A1").values = [["场景适配评分｜0=不具备，5=领先；综合分由权重自动计算"]];
scoring.getRange("A1:M1").format = titleFormat;
scoring.getRange("A3").values = [["评分维度"]];
writeMatrix(scoring, "B3", [weights.map((row) => row.criterion)]);
scoring.getRange("A4").values = [["权重"]];
writeMatrix(scoring, "B4", [weights.map((row) => Number(row.weight))]);
scoring.getRange("A3:G3").format = subHeaderFormat;
scoring.getRange("A4:G4").format = { fill: palette.lightBlue, font: { bold: true }, horizontalAlignment: "center" };
scoring.getRange("B4:G4").format.numberFormat = "0%";
scoring.getRange("A6:M6").values = [[
  "厂商", "型号", "参与移动排名", "蟹行硬门槛", "底盘移动", "工作空间", "力控柔顺", "精度", "接口开放", "工业成熟", "综合分", "建议", "说明",
]];
scoring.getRange("A6:M6").format = headerFormat;

writeMatrix(scoring, "A7", scores.map((row) => [
  row.vendor,
  row.model,
  row.eligible_for_ranking,
  row.crab_gate,
  Number(row.base_score),
  Number(row.workspace_score),
  Number(row.force_score),
  Number(row.precision_score),
  Number(row.interface_score),
  Number(row.industrial_score),
  null,
  null,
  row.score_note,
]));
const scoreStart = 7;
const scoreEnd = scoreStart + scores.length - 1;
for (let row = scoreStart; row <= scoreEnd; row += 1) {
  scoring.getRange(`K${row}`).formulas = [[`=IF(C${row}<>"是","",SUMPRODUCT(E${row}:J${row},$B$4:$G$4))`]];
  scoring.getRange(`L${row}`).formulas = [[`=IF(C${row}<>"是","不参与移动本体排名",IF(D${row}="不通过","不进入布线POC",IF(K${row}>=4.2,"优先POC",IF(K${row}>=3.5,"条件POC","补齐资料后再评估"))))`]];
}
scoring.getRange(`E7:J${scoreEnd}`).dataValidation = {
  rule: { type: "wholeNumber", operator: "between", formula1: 0, formula2: 5 },
  errorAlert: { showAlert: true, title: "评分超范围", message: "请输入 0 到 5 的整数。" },
};
scoring.getRange(`K7:K${scoreEnd}`).format.numberFormat = "0.00";
scoring.getRange(`K7:K${scoreEnd}`).conditionalFormats.addColorScale({
  minColor: palette.red,
  midColor: palette.amber,
  maxColor: palette.green,
});
scoring.getRange(`D7:D${scoreEnd}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"不通过"',
  format: { fill: palette.red, font: { color: "#9C0006", bold: true } },
});
scoring.getRange(`D7:D${scoreEnd}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"通过"',
  format: { fill: palette.green, font: { color: "#375623", bold: true } },
});
scoring.getRange(`A6:M${scoreEnd}`).format.wrapText = true;
scoring.getRange(`A7:M${scoreEnd}`).format.rowHeight = 30;
scoring.getRange("A:A").format.columnWidth = 11;
scoring.getRange("B:B").format.columnWidth = 26;
scoring.getRange("C:D").format.columnWidth = 13;
scoring.getRange("E:J").format.columnWidth = 11;
scoring.getRange("K:K").format.columnWidth = 10;
scoring.getRange("L:L").format.columnWidth = 22;
scoring.getRange("M:M").format.columnWidth = 54;
scoring.freezePanes.freezeRows(6);
scoring.tables.add(`A6:M${scoreEnd}`, true, "ScenarioScores");

// 3. 参数主表：输入数据，字段保持机器可读。
const robotSheet = baseSheet("参数主表");
robotSheet.mergeCells("A1:AK1");
robotSheet.getRange("A1").values = [["机器人本体参数主表｜空白表示待供应商确认，不代表 0"]];
robotSheet.getRange("A1:AK1").format = titleFormat;
const robotHeaders = Object.keys(robots[0]);
writeMatrix(robotSheet, "A3", [robotHeaders]);
robotSheet.getRange("A3:AK3").format = headerFormat;
writeMatrix(robotSheet, "A4", robots.map((row) => robotHeaders.map((header) => {
  const numericHeaders = new Set([
    "total_dof_excl_ee", "arm_dof_each", "torso_dof", "head_dof", "base_planar_dof", "base_speed_mps",
    "height_min_mm", "height_max_mm", "width_mm", "length_mm", "weight_kg", "arm_reach_mm", "bimanual_span_mm",
    "payload_per_arm_rated_kg", "payload_per_arm_peak_kg", "bimanual_rated_kg", "bimanual_peak_kg", "repeatability_mm",
    "absolute_accuracy_mm", "force_resolution_nm", "force_sample_hz",
  ]);
  return numericHeaders.has(header) ? asNumber(row[header]) : row[header];
})));
robotSheet.getRange(`A3:AK${3 + robots.length}`).format.wrapText = true;
robotSheet.getRange(`A4:AK${3 + robots.length}`).format.rowHeight = 34;
robotSheet.getRange("A:AK").format.columnWidth = 13;
robotSheet.getRange("B:C").format.columnWidth = 23;
robotSheet.getRange("K:K").format.columnWidth = 24;
robotSheet.getRange("AC:AC").format.columnWidth = 34;
robotSheet.getRange("AE:AE").format.columnWidth = 24;
robotSheet.getRange("AH:AK").format.columnWidth = 38;
robotSheet.freezePanes.freezeRows(3);
robotSheet.freezePanes.freezeColumns(3);
robotSheet.tables.add(`A3:AK${3 + robots.length}`, true, "RobotMasterData");

// 4. 问题清单：将信息缺口转为可关闭的动作。
const questionSheet = baseSheet("问题清单");
questionSheet.mergeCells("A1:J1");
questionSheet.getRange("A1").values = [["供应商问题与 POC 清单｜优先关闭硬门槛、安全和接口风险"]];
questionSheet.getRange("A1:J1").format = titleFormat;
const questionHeaders = Object.keys(questions[0]);
writeMatrix(questionSheet, "A3", [questionHeaders]);
questionSheet.getRange("A3:J3").format = headerFormat;
writeMatrix(questionSheet, "A4", questions.map((row) => questionHeaders.map((header) => row[header])));
const questionEnd = 3 + questions.length;
questionSheet.getRange(`A3:J${questionEnd}`).format.wrapText = true;
questionSheet.getRange(`A4:J${questionEnd}`).format.rowHeight = 38;
questionSheet.getRange("A:A").format.columnWidth = 18;
questionSheet.getRange("B:B").format.columnWidth = 12;
questionSheet.getRange("C:C").format.columnWidth = 15;
questionSheet.getRange("D:D").format.columnWidth = 52;
questionSheet.getRange("E:E").format.columnWidth = 16;
questionSheet.getRange("F:F").format.columnWidth = 40;
questionSheet.getRange("G:G").format.columnWidth = 18;
questionSheet.getRange("H:H").format.columnWidth = 12;
questionSheet.getRange("I:I").format.columnWidth = 16;
questionSheet.getRange("J:J").format.columnWidth = 24;
questionSheet.getRange(`D4:D${questionEnd}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"P0"',
  format: { fill: palette.red, font: { color: "#9C0006", bold: true } },
});
questionSheet.getRange(`D4:D${questionEnd}`).conditionalFormats.addCellIs({
  operator: "equalTo",
  formula: '"P1"',
  format: { fill: palette.amber, font: { color: "#7F6000", bold: true } },
});
questionSheet.getRange(`H4:H${questionEnd}`).dataValidation = {
  rule: { type: "list", formula1: '"待供应商回复,待POC,待IT联调,进行中,已关闭,不适用"' },
};
questionSheet.freezePanes.freezeRows(3);
questionSheet.tables.add(`A3:J${questionEnd}`, true, "SupplierQuestions");

// 5. 来源：每个参数结论都能回到证据。
const sourceSheet = baseSheet("来源证据");
sourceSheet.mergeCells("A1:I1");
sourceSheet.getRange("A1").values = [["来源证据登记｜内部文件仅登记名称，不随仓库上传"]];
sourceSheet.getRange("A1:I1").format = titleFormat;
const sourceHeaders = Object.keys(sources[0]);
writeMatrix(sourceSheet, "A3", [sourceHeaders]);
sourceSheet.getRange("A3:I3").format = headerFormat;
writeMatrix(sourceSheet, "A4", sources.map((row) => sourceHeaders.map((header) => row[header])));
const sourceEnd = 3 + sources.length;
sourceSheet.getRange(`A3:I${sourceEnd}`).format.wrapText = true;
sourceSheet.getRange(`A4:I${sourceEnd}`).format.rowHeight = 42;
sourceSheet.getRange("A:A").format.columnWidth = 18;
sourceSheet.getRange("B:B").format.columnWidth = 12;
sourceSheet.getRange("C:C").format.columnWidth = 33;
sourceSheet.getRange("D:D").format.columnWidth = 48;
sourceSheet.getRange("E:E").format.columnWidth = 16;
sourceSheet.getRange("F:F").format.columnWidth = 48;
sourceSheet.getRange("G:G").format.columnWidth = 14;
sourceSheet.getRange("H:H").format.columnWidth = 12;
sourceSheet.getRange("I:I").format.columnWidth = 38;
for (let row = 4; row <= sourceEnd; row += 1) {
  const url = sources[row - 4].source_url_or_path;
  if (/^https?:\/\//.test(url)) {
    sourceSheet.getRange(`D${row}`).formulas = [[`=HYPERLINK("${url}","${url}")`]];
  }
}
sourceSheet.freezePanes.freezeRows(3);
sourceSheet.tables.add(`A3:I${sourceEnd}`, true, "EvidenceSources");

wb.recalculate();

const keyCheck = wb.inspect({
  kind: "table",
  range: `场景评分!A1:M${scoreEnd}`,
  include: "values,formulas",
  table_max_rows: 20,
  table_max_cols: 13,
});
console.log("KEY_RANGE_CHECK");
console.log(keyCheck.ndjson ?? JSON.stringify(keyCheck));

const formulaErrors = wb.inspect({
  kind: "match",
  search_term: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { use_regex: true, max_results: 200 },
  summary: "final formula error scan",
});
console.log("FORMULA_ERROR_SCAN");
console.log(formulaErrors.ndjson ?? JSON.stringify(formulaErrors));

for (const [sheetName, range, fileName] of [
  ["决策摘要", `A1:G${noteRow}`, "决策摘要.png"],
  ["场景评分", `A1:M${scoreEnd}`, "场景评分.png"],
  ["参数主表", `A1:AK${3 + robots.length}`, "参数主表.png"],
  ["问题清单", `A1:J${questionEnd}`, "问题清单.png"],
  ["来源证据", `A1:I${sourceEnd}`, "来源证据.png"],
]) {
  const image = await wb.render({ sheetName, range, scale: 1.1 });
  fs.writeFileSync(path.join(previewDir, fileName), Buffer.from(await image.arrayBuffer()));
}

const outputPath = path.join(outputDir, "机器人本体产品主表.xlsx");
const exported = await SpreadsheetFile.exportXlsx(wb);
await exported.save(outputPath);

const savedBlob = await FileBlob.load(outputPath);
const savedWorkbook = await SpreadsheetFile.importXlsx(savedBlob);
const savedCheck = savedWorkbook.inspect({
  kind: "table",
  range: `决策摘要!A1:G${noteRow}`,
  include: "values,formulas",
  table_max_rows: 30,
  table_max_cols: 7,
});
console.log("SAVED_FILE_CHECK");
console.log(savedCheck.ndjson ?? JSON.stringify(savedCheck));
console.log(`WROTE ${outputPath}`);
