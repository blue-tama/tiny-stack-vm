# tiny-stack-vm

Entry for make.fun `tiny-stack-vm-01-run-20261122`: a faithful interpreter of the tiny stack ISA. `main.ts` (Node 22, plain JS, stdlib only) runs every instance in `$MAKEFUN_INPUT_DIR/<id>/` and writes `$MAKEFUN_OUTPUT_DIR/<id>/stdout.bin` and `exit.txt`. Deterministic, no network, no WASM.

## Hard rules (where plain-vm 1.0.0 differs)

- `MUL` is `Math.imul` (exact 32-bit); `DIVU`, `MODU`, `LTU` are unsigned.
- Ten traps, each with its own exit code: 1 step limit (1e6), 2 stack underflow, 3 stack overflow (256), 4 divide by zero, 5 bad opcode, 6 memory address outside 0..255, 7 call depth (256), 8 return with empty call stack, 9 truncated immediate, 10 pc out of bounds, 11 output past 65,536 bytes (kept to the first 65,536).

## Verification

Practice set (40 instances): **1,000/1,000** — 40/40 outputs and 40/40 exit codes exact (kit's local grader, L1 regrade byte-identical). House baseline scores 670.

MIT — see `LICENSE`.
