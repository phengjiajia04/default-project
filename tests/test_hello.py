import sys

sys.path.insert(0, "src")

from hello import greet


def test_greet():
    assert greet("World") == "Hello, World!"