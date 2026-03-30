@echo off
REM 使用 uv 运行 xls_to_csv.py 脚本
REM 用法: run.bat <输入xls文件> [输出csv文件]

if "%~1"=="" (
    echo 用法: run.bat ^<输入xls文件^> [输出csv文件]
    echo 示例: run.bat ..\doc\账单_脱敏.xls
    exit /b 1
)

REM 检查是否已安装依赖，如果没有则先安装
if not exist ".venv\" (
    echo 首次运行，正在安装依赖...
    uv pip install -r requirements.txt
)

uv run python xls_to_csv.py %*

