# XLS转CSV工具

使用 uv 管理依赖的简单转换工具。

## 快速开始

### 方式1: 使用 uv sync + uv run（推荐）

```bash
# 首次使用：同步依赖（基于 pyproject.toml）
uv sync

# 运行脚本
uv run python xls_to_csv.py ../doc/账单_脱敏.xls

# 指定输出文件
uv run python xls_to_csv.py ../doc/账单_脱敏.xls ../doc/账单_脱敏.csv
```

### 方式2: 使用 uv pip install（简单直接）

```bash
# 首次使用：安装依赖
uv pip install -r requirements.txt

# 运行脚本
uv run python xls_to_csv.py ../doc/账单_脱敏.xls
```

### 方式3: 手动管理虚拟环境

```bash
# 1. 创建虚拟环境
uv venv

# 2. 激活虚拟环境
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat

# 3. 安装依赖
uv pip install -r requirements.txt

# 4. 运行脚本
python xls_to_csv.py ../doc/账单_脱敏.xls
```

## 依赖

- pandas: 数据处理
- xlrd: 读取 .xls 文件
- openpyxl: 读取 .xlsx 文件（备用）

