# jixinlearn

命令行斐波那契数列工具。

## 功能

- 计算第 n 个斐波那契数（F(0)=0，F(1)=1）
- 打印前 n 项数列

## 用法

```bash
# 计算第 10 项
python3 fibonacci.py 10

# 打印前 10 项
python3 fibonacci.py --sequence 10

# 查看帮助
python3 fibonacci.py -h
```

## 测试

```bash
python3 -m unittest test_fibonacci.py
```
