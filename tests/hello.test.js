import test from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/hello.js";

test("greet returns greeting message", () => {
  assert.equal(greet("World"), "Hello, World!");
});