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


class ChineseHelpFormatter(argparse.HelpFormatter):
    """把帮助文案中的 usage: 前缀改为中文「用法：」。"""

    def add_usage(self, usage, actions, groups, prefix=None):
        if prefix is None:
            prefix = "用法："
        return super().add_usage(usage, actions, groups, prefix)


class ChineseArgumentParser(argparse.ArgumentParser):
    """将 argparse 帮助与错误提示显示为中文。"""

    def __init__(self, *args, **kwargs) -> None:
        kwargs.setdefault("add_help", False)
        kwargs.setdefault("formatter_class", ChineseHelpFormatter)
        super().__init__(*args, **kwargs)
        self._positionals.title = "位置参数"
        self._optionals.title = "可选参数"
        self.add_argument(
            "-h",
            "--help",
            action="help",
            default=argparse.SUPPRESS,
            help="显示此帮助信息并退出",
        )

    def error(self, message: str) -> None:
        self.print_usage(sys.stderr)
        self.exit(2, f"{self.prog}: 错误：{_translate_argparse_error(message)}\n")


def _translate_argparse_error(message: str) -> str:
    """将常见 argparse 英文错误改写为中文。"""
    required_prefix = "the following arguments are required: "
    if message.startswith(required_prefix):
        return f"缺少必要参数：{message[len(required_prefix):]}"

    invalid_int = "invalid int value: "
    argument_prefix = "argument "
    if message.startswith(argument_prefix) and invalid_int in message:
        name, _, value = message[len(argument_prefix) :].partition(f": {invalid_int}")
        return f"参数 {name}：无效的整数值：{value}"

    unrecognized = "unrecognized arguments: "
    if message.startswith(unrecognized):
        return f"无法识别的参数：{message[len(unrecognized):]}"

    return message


def build_parser() -> argparse.ArgumentParser:
    parser = ChineseArgumentParser(description="计算斐波那契数或打印数列。")
    parser.add_argument(
        "n",
        type=int,
        metavar="项数",
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
