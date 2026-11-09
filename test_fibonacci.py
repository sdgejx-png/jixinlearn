import io
import unittest
from contextlib import redirect_stderr, redirect_stdout

from fibonacci import fibonacci, fibonacci_sequence, main


class FibonacciTest(unittest.TestCase):
    def test_base_cases(self) -> None:
        self.assertEqual(fibonacci(0), 0)
        self.assertEqual(fibonacci(1), 1)

    def test_known_values(self) -> None:
        expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]
        self.assertEqual([fibonacci(i) for i in range(len(expected))], expected)

    def test_larger_value(self) -> None:
        self.assertEqual(fibonacci(50), 12586269025)

    def test_sequence(self) -> None:
        self.assertEqual(fibonacci_sequence(0), [])
        self.assertEqual(fibonacci_sequence(1), [0])
        self.assertEqual(fibonacci_sequence(7), [0, 1, 1, 2, 3, 5, 8])

    def test_rejects_negative_and_non_int(self) -> None:
        with self.assertRaises(ValueError):
            fibonacci(-1)
        with self.assertRaises(TypeError):
            fibonacci(1.5)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            fibonacci(True)  # type: ignore[arg-type]
        with self.assertRaises(ValueError):
            fibonacci_sequence(-3)

    def test_cli(self) -> None:
        nth = io.StringIO()
        with redirect_stdout(nth):
            self.assertEqual(main(["10"]), 0)
        self.assertEqual(nth.getvalue().strip(), "55")

        sequence = io.StringIO()
        with redirect_stdout(sequence):
            self.assertEqual(main(["6", "--sequence"]), 0)
        self.assertEqual(sequence.getvalue().strip(), "0 1 1 2 3 5")

        with redirect_stderr(io.StringIO()):
            self.assertEqual(main(["-1"]), 2)


if __name__ == "__main__":
    unittest.main()
