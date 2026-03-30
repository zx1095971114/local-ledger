#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单的XLS转CSV脚本
用法: python xls_to_csv.py <输入xls文件> [输出csv文件]
"""

import sys
import pandas as pd
import os


def xls_to_csv(input_file, output_file=None):
    """
    将XLS文件转换为CSV文件
    
    Args:
        input_file: 输入的xls文件路径
        output_file: 输出的csv文件路径（可选，默认与输入文件同名）
    """
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误: 文件 '{input_file}' 不存在")
        return False
    
    # 如果没有指定输出文件，使用输入文件名（替换扩展名）
    if output_file is None:
        base_name = os.path.splitext(input_file)[0]
        output_file = base_name + '.csv'
    
    try:
        # 读取xls文件
        print(f"正在读取: {input_file}")
        df = pd.read_excel(input_file, engine='xlrd')
        
        # 转换为csv
        print(f"正在转换为: {output_file}")
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"转换成功! 输出文件: {output_file}")
        print(f"共 {len(df)} 行数据")
        return True
        
    except Exception as e:
        print(f"转换失败: {str(e)}")
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python xls_to_csv.py <输入xls文件> [输出csv文件]")
        print("示例: python xls_to_csv.py doc/账单_脱敏.xls")
        print("示例: python xls_to_csv.py doc/账单_脱敏.xls doc/账单_脱敏.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    xls_to_csv(input_file, output_file)

