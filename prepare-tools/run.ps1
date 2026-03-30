# 使用 uv 运行 xls_to_csv.py 脚本
# 用法: .\run.ps1 <输入xls文件> [输出csv文件]

if ($args.Count -eq 0) {
    Write-Host "用法: .\run.ps1 <输入xls文件> [输出csv文件]"
    Write-Host "示例: .\run.ps1 ..\doc\账单_脱敏.xls"
    exit 1
}

# 检查是否已安装依赖，如果没有则先安装
if (-not (Test-Path ".venv")) {
    Write-Host "首次运行，正在安装依赖..."
    uv pip install -r requirements.txt
}

uv run python xls_to_csv.py $args

