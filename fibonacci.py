#!/usr/bin/env python3
"""斐波那契数列。

F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)。
"""

from __future__ import annotations

import argparse
import sys


def fibonacci(n: int) -> int:
    """返回第 n 个斐波那契数（从 0 开始：F(0)=0, F(1)=1）。"""
    if not isinstance(n, int) or isinstance(n, bool):
        raise TypeError("n 必须是整数")
    if n < 0:
        raise ValueError("n 必须是非负整数")
    if n < 2:
        return n

    previous, current = 0, 1
    for _ in range(2, n + 1):
        previous, current = current, previous + current
    return current


def fibonacci_sequence(count: int) -> list[int]:
    """返回前 count 个斐波那契数，即 F(0) 到 F(count - 1)。"""
    if not isinstance(count, int) or isinstance(count, bool):
        raise TypeError("count 必须是整数")
    if count < 0:
        raise ValueError("count 必须是非负整数")
    return [fibonacci(i) for i in range(count)]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="计算斐波那契数或打印数列。")
    parser.add_argument(
        "n",
        type=int,
        help="第 n 项（默认），或与 --sequence 一起表示要打印的项数",
    )
    parser.add_argument(
        "-s",
        "--sequence",
        action="store_true",
        help="打印前 n 项，而不是只输出第 n 项",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.n < 0:
        print("n 必须是非负整数", file=sys.stderr)
        return 2

    if args.sequence:
        print(" ".join(str(value) for value in fibonacci_sequence(args.n)))
    else:
        print(fibonacci(args.n))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
