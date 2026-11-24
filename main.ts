// tiny-stack-vm: a faithful interpreter of make.fun's tiny stack ISA.
// Traps (each with its own exit code): 1 step limit (1e6), 2 stack underflow,
// 3 stack overflow (256 values), 4 divide by zero, 5 bad opcode, 6 memory
// address outside 0..255, 7 call depth (256), 8 return with an empty call
// stack, 9 truncated immediate, 10 program counter out of bounds,
// 11 output past 65,536 bytes (output kept to the first 65,536).
// MUL is Math.imul (exact 32-bit); DIVU, MODU and LTU are unsigned.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, inp) {
  const D = [];
  const C = [];
  const M = new Int32Array(256);
  const out = [];
  let pc = 0;
  let ip = 0;
  let steps = 0;
  const push = (v) => {
    if (D.length >= 256) throw 3;
    D.push(v | 0);
  };
  const pop = () => {
    if (D.length === 0) throw 2;
    return D.pop();
  };
  try {
    for (;;) {
      if (++steps > 1e6) throw 1;
      if (pc < 0 || pc >= p.length) throw 10;
      const op = p[pc++];
      if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) {
        const b = pop();
        const a = pop();
        let r;
        if (op === 0x10) r = a + b;
        else if (op === 0x11) r = a - b;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) throw 4;
          r = Math.trunc(a / b);
        } else if (op === 0x14) {
          if (b === 0) throw 4;
          r = a % b;
        } else if (op === 0x15) {
          if (b === 0) throw 4;
          r = Math.trunc((a >>> 0) / (b >>> 0));
        } else if (op === 0x16) {
          if (b === 0) throw 4;
          r = (a >>> 0) % (b >>> 0);
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << b;
        else if (op === 0x1d) r = a >> b;
        else if (op === 0x1e) r = a >>> b;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else if (op === 0x22) r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        else throw 5;
        push(r);
        continue;
      }
      switch (op) {
        case 0x00:
          return { out, code: 0 };
        case 0x01:
          if (pc >= p.length) throw 9;
          push((p[pc++] << 24) >> 24);
          break;
        case 0x02:
          if (pc + 4 > p.length) throw 9;
          push(p[pc] | (p[pc + 1] << 8) | (p[pc + 2] << 16) | (p[pc + 3] << 24));
          pc += 4;
          break;
        case 0x03:
          pop();
          break;
        case 0x04: {
          const a = pop();
          push(a);
          push(a);
          break;
        }
        case 0x05: {
          const b = pop();
          const a = pop();
          push(b);
          push(a);
          break;
        }
        case 0x06: {
          const b = pop();
          const a = pop();
          push(a);
          push(b);
          push(a);
          break;
        }
        case 0x07: {
          const c = pop();
          const b = pop();
          const a = pop();
          push(b);
          push(c);
          push(a);
          break;
        }
        case 0x17:
          push(-pop());
          break;
        case 0x1b:
          push(~pop());
          break;
        case 0x30:
        case 0x31:
        case 0x32: {
          if (pc + 2 > p.length) throw 9;
          const rel = ((p[pc] | (p[pc + 1] << 8)) << 16) >> 16;
          pc += 2;
          const take = op === 0x30 || (op === 0x31) === (pop() === 0);
          if (take) pc += rel;
          break;
        }
        case 0x33:
          if (pc + 2 > p.length) throw 9;
          if (C.length >= 256) throw 7;
          C.push(pc + 2);
          pc = p[pc] | (p[pc + 1] << 8);
          break;
        case 0x34:
          if (C.length === 0) throw 8;
          pc = C.pop();
          break;
        case 0x40: {
          const addr = pop();
          if (addr < 0 || addr > 255) throw 6;
          push(M[addr]);
          break;
        }
        case 0x41: {
          const addr = pop();
          if (addr < 0 || addr > 255) throw 6;
          M[addr] = pop();
          break;
        }
        case 0x50:
          for (const ch of String(pop())) out.push(ch.charCodeAt(0));
          if (out.length > 65536) {
            out.length = 65536;
            throw 11;
          }
          break;
        case 0x51:
          out.push(pop() & 255);
          if (out.length > 65536) {
            out.length = 65536;
            throw 11;
          }
          break;
        case 0x52:
          push(ip < inp.length ? inp[ip++] : -1);
          break;
        case 0x53:
          return { out, code: pop() & 255 };
        default:
          throw 5;
      }
    }
  } catch (e) {
    if (typeof e === 'number') return { out, code: e };
    throw e;
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(
    new Uint8Array(readFileSync(join(I, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(I, id, 'input.bin'))),
  );
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), Uint8Array.from(r.out));
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
