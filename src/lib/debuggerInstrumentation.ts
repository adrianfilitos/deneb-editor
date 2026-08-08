// Instrumentación del depurador: código puro, sin dependencias de Monaco o
// stores. Se usa tanto en el navegador como en los tests de Node.

export interface InstrumentedSource {
  instrumented: string
  lineMap: Map<number, number>
}

export function instrumentCode(code: string): InstrumentedSource {
  const lines = code.split('\n')
  const out: string[] = []
  const lineMap = new Map<number, number>()
  for (let i = 0; i < lines.length; i++) {
    lineMap.set(i + 1, i + 1)
    const trimmed = lines[i].trim()
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      out.push(`await __novaCheck(${i + 1});${lines[i]}`)
    } else {
      out.push(lines[i])
    }
  }
  return { instrumented: out.join('\n'), lineMap }
}

export function createWorkerSource(code: string, bpSet: number[], file: string): string {
  return `
"use strict";
var __novaBp = ${JSON.stringify(bpSet)};
var __novaResolvers = [];
var __novaStepBp = null;

function __novaVars() {
  var out = [];
  var keys = Object.keys(globalThis).filter(function (k) {
    return /^[a-zA-Z_$]/.test(k) && !/^__nova/.test(k) && typeof globalThis[k] !== 'function';
  }).slice(0, 40);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = globalThis[k];
    var t = Array.isArray(v) ? 'array' : typeof v;
    var val;
    try { val = (typeof v === 'object') ? JSON.stringify(v) : String(v); }
    catch (e2) { val = '[no serializable]'; }
    out.push({ name: k, value: val, type: t });
  }
  return out;
}

function __novaCheck(line) {
  var isBp = __novaBp.indexOf(line) >= 0 || __novaStepBp === line;
  __novaStepBp = null;
  if (!isBp) return Promise.resolve();
  self.postMessage({ type: 'breakpoint', line: line, file: ${JSON.stringify(file)}, vars: __novaVars(), frames: [{ line: line, name: 'top-level', file: ${JSON.stringify(file)} }] });
  return new Promise(function (resolve) { __novaResolvers.push(resolve); });
}

var __novaOrigLog = console.log;
console.log = function () {
  var args = Array.prototype.slice.call(arguments).map(String);
  self.postMessage({ type: 'console', text: args.join(' ') });
  __novaOrigLog.apply(console, arguments);
};
var __novaOrigErr = console.error;
console.error = function () {
  var args = Array.prototype.slice.call(arguments).map(String);
  self.postMessage({ type: 'console', text: 'ERROR: ' + args.join(' ') });
  __novaOrigErr.apply(console, arguments);
};

self.onmessage = function (e) {
  if (!e.data) return;
  if (e.data.cmd === 'continue') {
    while (__novaResolvers.length) __novaResolvers.shift()();
  } else if (e.data.cmd === 'step' && typeof e.data.nextBreakpoint === 'number') {
    __novaStepBp = e.data.nextBreakpoint;
    while (__novaResolvers.length) __novaResolvers.shift()();
  }
};

(async function () {
  try {
    ${code}
    self.postMessage({ type: 'done' });
  } catch (err) {
    self.postMessage({ type: 'error', text: String((err && err.stack) || err) });
  }
})();
`;
}
