var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/fflate/esm/index.mjs
var esm_exports = {};
__export(esm_exports, {
  AsyncCompress: () => AsyncGzip,
  AsyncDecompress: () => AsyncDecompress,
  AsyncDeflate: () => AsyncDeflate,
  AsyncGunzip: () => AsyncGunzip,
  AsyncGzip: () => AsyncGzip,
  AsyncInflate: () => AsyncInflate,
  AsyncUnzipInflate: () => AsyncUnzipInflate,
  AsyncUnzlib: () => AsyncUnzlib,
  AsyncZipDeflate: () => AsyncZipDeflate,
  AsyncZlib: () => AsyncZlib,
  Compress: () => Gzip,
  DecodeUTF8: () => DecodeUTF8,
  Decompress: () => Decompress,
  Deflate: () => Deflate,
  EncodeUTF8: () => EncodeUTF8,
  FlateErrorCode: () => FlateErrorCode,
  Gunzip: () => Gunzip,
  Gzip: () => Gzip,
  Inflate: () => Inflate,
  Unzip: () => Unzip,
  UnzipInflate: () => UnzipInflate,
  UnzipPassThrough: () => UnzipPassThrough,
  Unzlib: () => Unzlib,
  Zip: () => Zip,
  ZipDeflate: () => ZipDeflate,
  ZipPassThrough: () => ZipPassThrough,
  Zlib: () => Zlib,
  compress: () => gzip,
  compressSync: () => gzipSync,
  decompress: () => decompress,
  decompressSync: () => decompressSync,
  deflate: () => deflate,
  deflateSync: () => deflateSync,
  gunzip: () => gunzip,
  gunzipSync: () => gunzipSync,
  gzip: () => gzip,
  gzipSync: () => gzipSync,
  inflate: () => inflate,
  inflateSync: () => inflateSync,
  strFromU8: () => strFromU8,
  strToU8: () => strToU8,
  unzip: () => unzip,
  unzipSync: () => unzipSync,
  unzlib: () => unzlib,
  unzlibSync: () => unzlibSync,
  zip: () => zip,
  zipSync: () => zipSync,
  zlib: () => zlib,
  zlibSync: () => zlibSync
});
import { createRequire } from "module";
function StrmOpt(opts, cb) {
  if (typeof opts == "function")
    cb = opts, opts = {};
  this.ondata = cb;
  return opts;
}
function deflate(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bDflt
  ], function(ev) {
    return pbf(deflateSync(ev.data[0], ev.data[1]));
  }, 0, cb);
}
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflate(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bInflt
  ], function(ev) {
    return pbf(inflateSync(ev.data[0], gopt(ev.data[1])));
  }, 1, cb);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function gzip(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bDflt,
    gze,
    function() {
      return [gzipSync];
    }
  ], function(ev) {
    return pbf(gzipSync(ev.data[0], ev.data[1]));
  }, 2, cb);
}
function gzipSync(data, opts) {
  if (!opts)
    opts = {};
  var c = crc(), l = data.length;
  c.p(data);
  var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
  return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
}
function gunzip(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bInflt,
    guze,
    function() {
      return [gunzipSync];
    }
  ], function(ev) {
    return pbf(gunzipSync(ev.data[0], ev.data[1]));
  }, 3, cb);
}
function gunzipSync(data, opts) {
  var st = gzs(data);
  if (st + 8 > data.length)
    err(6, "invalid gzip data");
  return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
function zlib(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bDflt,
    zle,
    function() {
      return [zlibSync];
    }
  ], function(ev) {
    return pbf(zlibSync(ev.data[0], ev.data[1]));
  }, 4, cb);
}
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
function unzlib(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return cbify(data, opts, [
    bInflt,
    zule,
    function() {
      return [unzlibSync];
    }
  ], function(ev) {
    return pbf(unzlibSync(ev.data[0], gopt(ev.data[1])));
  }, 5, cb);
}
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function decompress(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  return data[0] == 31 && data[1] == 139 && data[2] == 8 ? gunzip(data, opts, cb) : (data[0] & 15) != 8 || data[0] >> 4 > 7 || (data[0] << 8 | data[1]) % 31 ? inflate(data, opts, cb) : unzlib(data, opts, cb);
}
function decompressSync(data, opts) {
  return data[0] == 31 && data[1] == 139 && data[2] == 8 ? gunzipSync(data, opts) : (data[0] & 15) != 8 || data[0] >> 4 > 7 || (data[0] << 8 | data[1]) % 31 ? inflateSync(data, opts) : unzlibSync(data, opts);
}
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
function zip(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  var r = {};
  fltn(data, "", r, opts);
  var k = Object.keys(r);
  var lft = k.length, o = 0, tot = 0;
  var slft = lft, files = new Array(lft);
  var term = [];
  var tAll = function() {
    for (var i2 = 0; i2 < term.length; ++i2)
      term[i2]();
  };
  var cbd = function(a, b) {
    mt(function() {
      cb(a, b);
    });
  };
  mt(function() {
    cbd = cb;
  });
  var cbf = function() {
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    tot = 0;
    for (var i2 = 0; i2 < slft; ++i2) {
      var f = files[i2];
      try {
        var l = f.c.length;
        wzh(out, tot, f, f.f, f.u, l);
        var badd = 30 + f.f.length + exfl(f.extra);
        var loc = tot + badd;
        out.set(f.c, loc);
        wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
      } catch (e) {
        return cbd(e, null);
      }
    }
    wzf(out, o, files.length, cdl, oe);
    cbd(null, out);
  };
  if (!lft)
    cbf();
  var _loop_1 = function(i2) {
    var fn = k[i2];
    var _a2 = r[fn], file2 = _a2[0], p = _a2[1];
    var c = crc(), size = file2.length;
    c.p(file2);
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    var compression = p.level == 0 ? 0 : 8;
    var cbl = function(e, d) {
      if (e) {
        tAll();
        cbd(e, null);
      } else {
        var l = d.length;
        files[i2] = mrg(p, {
          size,
          crc: c.d(),
          c: d,
          f,
          m,
          u: s != fn.length || m && com.length != ms,
          compression
        });
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
        if (!--lft)
          cbf();
      }
    };
    if (s > 65535)
      cbl(err(11, 0, 1), null);
    if (!compression)
      cbl(null, file2);
    else if (size < 16e4) {
      try {
        cbl(null, deflateSync(file2, p));
      } catch (e) {
        cbl(e, null);
      }
    } else
      term.push(deflate(file2, p, cbl));
  };
  for (var i = 0; i < slft; ++i) {
    _loop_1(i);
  }
  return tAll;
}
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file2 = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file2, p) : file2, l = d.length;
    var c = crc();
    c.p(file2);
    files.push(mrg(p, {
      size: file2.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzip(data, opts, cb) {
  if (!cb)
    cb = opts, opts = {};
  if (typeof cb != "function")
    err(7);
  var term = [];
  var tAll = function() {
    for (var i2 = 0; i2 < term.length; ++i2)
      term[i2]();
  };
  var files = {};
  var cbd = function(a, b) {
    mt(function() {
      cb(a, b);
    });
  };
  mt(function() {
    cbd = cb;
  });
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558) {
      cbd(err(13, 0, 1), null);
      return tAll;
    }
  }
  ;
  var lft = b2(data, e + 8);
  if (lft) {
    var c = lft;
    var o = b4(data, e + 16);
    var z = b4(data, e - 20) == 117853008;
    if (z) {
      var ze = b4(data, e - 12);
      z = b4(data, ze) == 101075792;
      if (z) {
        c = lft = b4(data, ze + 32);
        o = b4(data, ze + 48);
      }
    }
    var fltr = opts && opts.filter;
    var _loop_3 = function(i2) {
      var _a2 = zh(data, o, z), c_1 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
      o = no;
      var cbl = function(e2, d) {
        if (e2) {
          tAll();
          cbd(e2, null);
        } else {
          if (d)
            files[fn] = d;
          if (!--lft)
            cbd(null, files);
        }
      };
      if (!fltr || fltr({
        name: fn,
        size: sc,
        originalSize: su,
        compression: c_1
      })) {
        if (!c_1)
          cbl(null, slc(data, b, b + sc));
        else if (c_1 == 8) {
          var infl = data.subarray(b, b + sc);
          if (su < 524288 || sc > 0.8 * su) {
            try {
              cbl(null, inflateSync(infl, { out: new u8(su) }));
            } catch (e2) {
              cbl(e2, null);
            }
          } else
            term.push(inflate(infl, { size: su }, cbl));
        } else
          cbl(err(14, "unknown compression type " + c_1, 1), null);
      } else
        cbl(null, null);
    };
    for (var i = 0; i < c; ++i) {
      _loop_3(i);
    }
  } else
    cbd(null, {});
  return tAll;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}
var require2, _a, Worker, isMarkedAsUntransferable, workerAdd, wk, u8, u16, i32, fleb, fdeb, clim, freb, _a, fl, revfl, _b, fd, revfd, rev, x, i, hMap, flt, i, i, i, i, fdt, i, flm, flrm, fdm, fdrm, max, bits, bits16, shft, slc, FlateErrorCode, ec, err, inflt, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, deo, et, dflt, crct, crc, adler, dopt, mrg, wcln, ch, cbfs, wrkr, bInflt, bDflt, gze, guze, zle, zule, pbf, gopt, cbify, astrm, astrmify, b2, b4, b8, wbytes, gzh, gzs, gzl, gzhl, zlh, zls, Deflate, AsyncDeflate, Inflate, AsyncInflate, Gzip, AsyncGzip, Gunzip, AsyncGunzip, Zlib, AsyncZlib, Unzlib, AsyncUnzlib, Decompress, AsyncDecompress, fltn, te, td, tds, dutf8, DecodeUTF8, EncodeUTF8, dbf, slzh, zh, z64hs, exfl, wzh, wzf, ZipPassThrough, ZipDeflate, AsyncZipDeflate, Zip, UnzipPassThrough, UnzipInflate, AsyncUnzipInflate, Unzip, mt;
var init_esm = __esm({
  "node_modules/fflate/esm/index.mjs"() {
    require2 = createRequire("/");
    workerAdd = ";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";
    try {
      _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
    } catch (e) {
    }
    wk = Worker ? function(c, _, msg, transfer, cb) {
      var done = false;
      var w = new Worker(c + workerAdd, { eval: true }).on("error", function(e) {
        return cb(e, null);
      }).on("message", function(m) {
        return cb(null, m);
      }).on("exit", function(c2) {
        if (c2 && !done)
          cb(new Error("exited with code " + c2), null);
      });
      if (isMarkedAsUntransferable)
        transfer = transfer.filter(function(t) {
          return !isMarkedAsUntransferable(t);
        });
      w.postMessage(msg, transfer);
      w.terminate = function() {
        done = true;
        return Worker.prototype.terminate.call(w);
      };
      return w;
    } : function(_, __, ___, ____, cb) {
      setImmediate(function() {
        return cb(new Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"), null);
      });
      var NOP = function() {
      };
      return {
        terminate: NOP,
        postMessage: NOP
      };
    };
    u8 = Uint8Array;
    u16 = Uint16Array;
    i32 = Int32Array;
    fleb = new u8([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
      4,
      4,
      4,
      4,
      5,
      5,
      5,
      5,
      0,
      /* unused */
      0,
      0,
      /* impossible */
      0
    ]);
    fdeb = new u8([
      0,
      0,
      0,
      0,
      1,
      1,
      2,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      6,
      6,
      7,
      7,
      8,
      8,
      9,
      9,
      10,
      10,
      11,
      11,
      12,
      12,
      13,
      13,
      /* unused */
      0,
      0
    ]);
    clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    freb = function(eb, start) {
      var b = new u16(31);
      for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
      }
      var r = new i32(b[30]);
      for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
          r[j] = j - b[i] << 5 | i;
        }
      }
      return { b, r };
    };
    _a = freb(fleb, 2);
    fl = _a.b;
    revfl = _a.r;
    fl[28] = 258, revfl[258] = 28;
    _b = freb(fdeb, 0);
    fd = _b.b;
    revfd = _b.r;
    rev = new u16(32768);
    for (i = 0; i < 32768; ++i) {
      x = (i & 43690) >> 1 | (i & 21845) << 1;
      x = (x & 52428) >> 2 | (x & 13107) << 2;
      x = (x & 61680) >> 4 | (x & 3855) << 4;
      rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
    }
    hMap = function(cd, mb, r) {
      var s = cd.length;
      var i = 0;
      var l = new u16(mb);
      for (; i < s; ++i) {
        if (cd[i])
          ++l[cd[i] - 1];
      }
      var le = new u16(mb);
      for (i = 1; i < mb; ++i) {
        le[i] = le[i - 1] + l[i - 1] << 1;
      }
      var co;
      if (r) {
        co = new u16(1 << mb);
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
          if (cd[i]) {
            var sv = i << 4 | cd[i];
            var r_1 = mb - cd[i];
            var v = le[cd[i] - 1]++ << r_1;
            for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
              co[rev[v] >> rvb] = sv;
            }
          }
        }
      } else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
          if (cd[i]) {
            co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
          }
        }
      }
      return co;
    };
    flt = new u8(288);
    for (i = 0; i < 144; ++i)
      flt[i] = 8;
    for (i = 144; i < 256; ++i)
      flt[i] = 9;
    for (i = 256; i < 280; ++i)
      flt[i] = 7;
    for (i = 280; i < 288; ++i)
      flt[i] = 8;
    fdt = new u8(32);
    for (i = 0; i < 32; ++i)
      fdt[i] = 5;
    flm = /* @__PURE__ */ hMap(flt, 9, 0);
    flrm = /* @__PURE__ */ hMap(flt, 9, 1);
    fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
    fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
    max = function(a) {
      var m = a[0];
      for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
          m = a[i];
      }
      return m;
    };
    bits = function(d, p, m) {
      var o = p / 8 | 0;
      return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
    };
    bits16 = function(d, p) {
      var o = p / 8 | 0;
      return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
    };
    shft = function(p) {
      return (p + 7) / 8 | 0;
    };
    slc = function(v, s, e) {
      if (s == null || s < 0)
        s = 0;
      if (e == null || e > v.length)
        e = v.length;
      return new u8(v.subarray(s, e));
    };
    FlateErrorCode = {
      UnexpectedEOF: 0,
      InvalidBlockType: 1,
      InvalidLengthLiteral: 2,
      InvalidDistance: 3,
      StreamFinished: 4,
      NoStreamHandler: 5,
      InvalidHeader: 6,
      NoCallback: 7,
      InvalidUTF8: 8,
      ExtraFieldTooLong: 9,
      InvalidDate: 10,
      FilenameTooLong: 11,
      StreamFinishing: 12,
      InvalidZipData: 13,
      UnknownCompressionMethod: 14
    };
    ec = [
      "unexpected EOF",
      "invalid block type",
      "invalid length/literal",
      "invalid distance",
      "stream finished",
      "no stream handler",
      ,
      // determined by compression function
      "no callback",
      "invalid UTF-8 data",
      "extra field too long",
      "date not in range 1980-2099",
      "filename too long",
      "stream finishing",
      "invalid zip data"
      // determined by unknown compression method
    ];
    err = function(ind, msg, nt) {
      var e = new Error(msg || ec[ind]);
      e.code = ind;
      if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
      if (!nt)
        throw e;
      return e;
    };
    inflt = function(dat, st, buf, dict) {
      var sl = dat.length, dl = dict ? dict.length : 0;
      if (!sl || st.f && !st.l)
        return buf || new u8(0);
      var noBuf = !buf;
      var resize = noBuf || st.i != 2;
      var noSt = st.i;
      if (noBuf)
        buf = new u8(sl * 3);
      var cbuf = function(l2) {
        var bl = buf.length;
        if (l2 > bl) {
          var nbuf = new u8(Math.max(bl * 2, l2));
          nbuf.set(buf);
          buf = nbuf;
        }
      };
      var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
      var tbts = sl * 8;
      do {
        if (!lm) {
          final = bits(dat, pos, 1);
          var type = bits(dat, pos + 1, 3);
          pos += 3;
          if (!type) {
            var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
            if (t > sl) {
              if (noSt)
                err(0);
              break;
            }
            if (resize)
              cbuf(bt + l);
            buf.set(dat.subarray(s, t), bt);
            st.b = bt += l, st.p = pos = t * 8, st.f = final;
            continue;
          } else if (type == 1)
            lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
          else if (type == 2) {
            var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
            var tl = hLit + bits(dat, pos + 5, 31) + 1;
            pos += 14;
            var ldt = new u8(tl);
            var clt = new u8(19);
            for (var i = 0; i < hcLen; ++i) {
              clt[clim[i]] = bits(dat, pos + i * 3, 7);
            }
            pos += hcLen * 3;
            var clb = max(clt), clbmsk = (1 << clb) - 1;
            var clm = hMap(clt, clb, 1);
            for (var i = 0; i < tl; ) {
              var r = clm[bits(dat, pos, clbmsk)];
              pos += r & 15;
              var s = r >> 4;
              if (s < 16) {
                ldt[i++] = s;
              } else {
                var c = 0, n = 0;
                if (s == 16)
                  n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                else if (s == 17)
                  n = 3 + bits(dat, pos, 7), pos += 3;
                else if (s == 18)
                  n = 11 + bits(dat, pos, 127), pos += 7;
                while (n--)
                  ldt[i++] = c;
              }
            }
            var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
            lbt = max(lt);
            dbt = max(dt);
            lm = hMap(lt, lbt, 1);
            dm = hMap(dt, dbt, 1);
          } else
            err(1);
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
        }
        if (resize)
          cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (; ; lpos = pos) {
          var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
          pos += c & 15;
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (!c)
            err(2);
          if (sym < 256)
            buf[bt++] = sym;
          else if (sym == 256) {
            lpos = pos, lm = null;
            break;
          } else {
            var add = sym - 254;
            if (sym > 264) {
              var i = sym - 257, b = fleb[i];
              add = bits(dat, pos, (1 << b) - 1) + fl[i];
              pos += b;
            }
            var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
            if (!d)
              err(3);
            pos += d & 15;
            var dt = fd[dsym];
            if (dsym > 3) {
              var b = fdeb[dsym];
              dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
            }
            if (pos > tbts) {
              if (noSt)
                err(0);
              break;
            }
            if (resize)
              cbuf(bt + 131072);
            var end = bt + add;
            if (bt < dt) {
              var shift = dl - dt, dend = Math.min(dt, end);
              if (shift + bt < 0)
                err(3);
              for (; bt < dend; ++bt)
                buf[bt] = dict[shift + bt];
            }
            for (; bt < end; ++bt)
              buf[bt] = buf[bt - dt];
          }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
          final = 1, st.m = lbt, st.d = dm, st.n = dbt;
      } while (!final);
      return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
    };
    wbits = function(d, p, v) {
      v <<= p & 7;
      var o = p / 8 | 0;
      d[o] |= v;
      d[o + 1] |= v >> 8;
    };
    wbits16 = function(d, p, v) {
      v <<= p & 7;
      var o = p / 8 | 0;
      d[o] |= v;
      d[o + 1] |= v >> 8;
      d[o + 2] |= v >> 16;
    };
    hTree = function(d, mb) {
      var t = [];
      for (var i = 0; i < d.length; ++i) {
        if (d[i])
          t.push({ s: i, f: d[i] });
      }
      var s = t.length;
      var t2 = t.slice();
      if (!s)
        return { t: et, l: 0 };
      if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return { t: v, l: 1 };
      }
      t.sort(function(a, b) {
        return a.f - b.f;
      });
      t.push({ s: -1, f: 25001 });
      var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
      t[0] = { s: -1, f: l.f + r.f, l, r };
      while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l, r };
      }
      var maxSym = t2[0].s;
      for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
          maxSym = t2[i].s;
      }
      var tr = new u16(maxSym + 1);
      var mbt = ln(t[i1 - 1], tr, 0);
      if (mbt > mb) {
        var i = 0, dt = 0;
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function(a, b) {
          return tr[b.s] - tr[a.s] || a.f - b.f;
        });
        for (; i < s; ++i) {
          var i2_1 = t2[i].s;
          if (tr[i2_1] > mb) {
            dt += cst - (1 << mbt - tr[i2_1]);
            tr[i2_1] = mb;
          } else
            break;
        }
        dt >>= lft;
        while (dt > 0) {
          var i2_2 = t2[i].s;
          if (tr[i2_2] < mb)
            dt -= 1 << mb - tr[i2_2]++ - 1;
          else
            ++i;
        }
        for (; i >= 0 && dt; --i) {
          var i2_3 = t2[i].s;
          if (tr[i2_3] == mb) {
            --tr[i2_3];
            ++dt;
          }
        }
        mbt = mb;
      }
      return { t: new u8(tr), l: mbt };
    };
    ln = function(n, l, d) {
      return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
    };
    lc = function(c) {
      var s = c.length;
      while (s && !c[--s])
        ;
      var cl = new u16(++s);
      var cli = 0, cln = c[0], cls = 1;
      var w = function(v) {
        cl[cli++] = v;
      };
      for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
          ++cls;
        else {
          if (!cln && cls > 2) {
            for (; cls > 138; cls -= 138)
              w(32754);
            if (cls > 2) {
              w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
              cls = 0;
            }
          } else if (cls > 3) {
            w(cln), --cls;
            for (; cls > 6; cls -= 6)
              w(8304);
            if (cls > 2)
              w(cls - 3 << 5 | 8208), cls = 0;
          }
          while (cls--)
            w(cln);
          cls = 1;
          cln = c[i];
        }
      }
      return { c: cl.subarray(0, cli), n: s };
    };
    clen = function(cf, cl) {
      var l = 0;
      for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
      return l;
    };
    wfblk = function(out, pos, dat) {
      var s = dat.length;
      var o = shft(pos + 2);
      out[o] = s & 255;
      out[o + 1] = s >> 8;
      out[o + 2] = out[o] ^ 255;
      out[o + 3] = out[o + 1] ^ 255;
      for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
      return (o + 4 + s) * 8;
    };
    wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
      wbits(out, p++, final);
      ++lf[256];
      var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
      var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
      var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
      var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
      var lcfreq = new u16(19);
      for (var i = 0; i < lclt.length; ++i)
        ++lcfreq[lclt[i] & 31];
      for (var i = 0; i < lcdt.length; ++i)
        ++lcfreq[lcdt[i] & 31];
      var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
      var nlcc = 19;
      for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
      var flen = bl + 5 << 3;
      var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
      var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
      if (bs >= 0 && flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
      var lm, ll, dm, dl;
      wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
      if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
          wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
          var clct = lcts[it];
          for (var i = 0; i < clct.length; ++i) {
            var len = clct[i] & 31;
            wbits(out, p, llm[len]), p += lct[len];
            if (len > 15)
              wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
          }
        }
      } else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
      }
      for (var i = 0; i < li; ++i) {
        var sym = syms[i];
        if (sym > 255) {
          var len = sym >> 18 & 31;
          wbits16(out, p, lm[len + 257]), p += ll[len + 257];
          if (len > 7)
            wbits(out, p, sym >> 23 & 31), p += fleb[len];
          var dst = sym & 31;
          wbits16(out, p, dm[dst]), p += dl[dst];
          if (dst > 3)
            wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
        } else {
          wbits16(out, p, lm[sym]), p += ll[sym];
        }
      }
      wbits16(out, p, lm[256]);
      return p + ll[256];
    };
    deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
    et = /* @__PURE__ */ new u8(0);
    dflt = function(dat, lvl, plvl, pre, post, st) {
      var s = st.z || dat.length;
      var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
      var w = o.subarray(pre, o.length - post);
      var lst = st.l;
      var pos = (st.r || 0) & 7;
      if (lvl) {
        if (pos)
          w[0] = st.r >> 3;
        var opt = deo[lvl - 1];
        var n = opt >> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function(i2) {
          return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
        };
        var syms = new i32(25e3);
        var lf = new u16(288), df = new u16(32);
        var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
        for (; i + 2 < s; ++i) {
          var hv = hsh(i);
          var imod = i & 32767, pimod = head[hv];
          prev[imod] = pimod;
          head[hv] = imod;
          if (wi <= i) {
            var rem = s - i;
            if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
              pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
              li = lc_1 = eb = 0, bs = i;
              for (var j = 0; j < 286; ++j)
                lf[j] = 0;
              for (var j = 0; j < 30; ++j)
                df[j] = 0;
            }
            var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
            if (rem > 2 && hv == hsh(i - dif)) {
              var maxn = Math.min(n, rem) - 1;
              var maxd = Math.min(32767, i);
              var ml = Math.min(258, rem);
              while (dif <= maxd && --ch_1 && imod != pimod) {
                if (dat[i + l] == dat[i + l - dif]) {
                  var nl = 0;
                  for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                    ;
                  if (nl > l) {
                    l = nl, d = dif;
                    if (nl > maxn)
                      break;
                    var mmd = Math.min(dif, nl - 2);
                    var md = 0;
                    for (var j = 0; j < mmd; ++j) {
                      var ti = i - dif + j & 32767;
                      var pti = prev[ti];
                      var cd = ti - pti & 32767;
                      if (cd > md)
                        md = cd, pimod = ti;
                    }
                  }
                }
                imod = pimod, pimod = prev[imod];
                dif += imod - pimod & 32767;
              }
            }
            if (d) {
              syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
              var lin = revfl[l] & 31, din = revfd[d] & 31;
              eb += fleb[lin] + fdeb[din];
              ++lf[257 + lin];
              ++df[din];
              wi = i + l;
              ++lc_1;
            } else {
              syms[li++] = dat[i];
              ++lf[dat[i]];
            }
          }
        }
        for (i = Math.max(i, wi); i < s; ++i) {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        if (!lst) {
          st.r = pos & 7 | w[pos / 8 | 0] << 3;
          pos -= 7;
          st.h = head, st.p = prev, st.i = i, st.w = wi;
        }
      } else {
        for (var i = st.w || 0; i < s + lst; i += 65535) {
          var e = i + 65535;
          if (e >= s) {
            w[pos / 8 | 0] = lst;
            e = s;
          }
          pos = wfblk(w, pos + 1, dat.subarray(i, e));
        }
        st.i = s;
      }
      return slc(o, 0, pre + shft(pos) + post);
    };
    crct = /* @__PURE__ */ function() {
      var t = new Int32Array(256);
      for (var i = 0; i < 256; ++i) {
        var c = i, k = 9;
        while (--k)
          c = (c & 1 && -306674912) ^ c >>> 1;
        t[i] = c;
      }
      return t;
    }();
    crc = function() {
      var c = -1;
      return {
        p: function(d) {
          var cr = c;
          for (var i = 0; i < d.length; ++i)
            cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
          c = cr;
        },
        d: function() {
          return ~c;
        }
      };
    };
    adler = function() {
      var a = 1, b = 0;
      return {
        p: function(d) {
          var n = a, m = b;
          var l = d.length | 0;
          for (var i = 0; i != l; ) {
            var e = Math.min(i + 2655, l);
            for (; i < e; ++i)
              m += n += d[i];
            n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
          }
          a = n, b = m;
        },
        d: function() {
          a %= 65521, b %= 65521;
          return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
        }
      };
    };
    dopt = function(dat, opt, pre, post, st) {
      if (!st) {
        st = { l: 1 };
        if (opt.dictionary) {
          var dict = opt.dictionary.subarray(-32768);
          var newDat = new u8(dict.length + dat.length);
          newDat.set(dict);
          newDat.set(dat, dict.length);
          dat = newDat;
          st.w = dict.length;
        }
      }
      return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
    };
    mrg = function(a, b) {
      var o = {};
      for (var k in a)
        o[k] = a[k];
      for (var k in b)
        o[k] = b[k];
      return o;
    };
    wcln = function(fn, fnStr, td2) {
      var dt = fn();
      var st = fn.toString();
      var ks = st.slice(st.indexOf("[") + 1, st.lastIndexOf("]")).replace(/\s+/g, "").split(",");
      for (var i = 0; i < dt.length; ++i) {
        var v = dt[i], k = ks[i];
        if (typeof v == "function") {
          fnStr += ";" + k + "=";
          var st_1 = v.toString();
          if (v.prototype) {
            if (st_1.indexOf("[native code]") != -1) {
              var spInd = st_1.indexOf(" ", 8) + 1;
              fnStr += st_1.slice(spInd, st_1.indexOf("(", spInd));
            } else {
              fnStr += st_1;
              for (var t in v.prototype)
                fnStr += ";" + k + ".prototype." + t + "=" + v.prototype[t].toString();
            }
          } else
            fnStr += st_1;
        } else
          td2[k] = v;
      }
      return fnStr;
    };
    ch = [];
    cbfs = function(v) {
      var tl = [];
      for (var k in v) {
        if (v[k].buffer) {
          tl.push((v[k] = new v[k].constructor(v[k])).buffer);
        }
      }
      return tl;
    };
    wrkr = function(fns, init, id, cb) {
      if (!ch[id]) {
        var fnStr = "", td_1 = {}, m = fns.length - 1;
        for (var i = 0; i < m; ++i)
          fnStr = wcln(fns[i], fnStr, td_1);
        ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
      }
      var td2 = mrg({}, ch[id].e);
      return wk(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init.toString() + "}", id, td2, cbfs(td2), cb);
    };
    bInflt = function() {
      return [u8, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt];
    };
    bDflt = function() {
      return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf];
    };
    gze = function() {
      return [gzh, gzhl, wbytes, crc, crct];
    };
    guze = function() {
      return [gzs, gzl];
    };
    zle = function() {
      return [zlh, wbytes, adler];
    };
    zule = function() {
      return [zls];
    };
    pbf = function(msg) {
      return postMessage(msg, [msg.buffer]);
    };
    gopt = function(o) {
      return o && {
        out: o.size && new u8(o.size),
        dictionary: o.dictionary
      };
    };
    cbify = function(dat, opts, fns, init, id, cb) {
      var w = wrkr(fns, init, id, function(err2, dat2) {
        w.terminate();
        cb(err2, dat2);
      });
      w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
      return function() {
        w.terminate();
      };
    };
    astrm = function(strm) {
      strm.ondata = function(dat, final) {
        return postMessage([dat, final], [dat.buffer]);
      };
      return function(ev) {
        if (ev.data[0]) {
          strm.push(ev.data[0], ev.data[1]);
          postMessage([ev.data[0].length]);
        } else
          strm.flush(ev.data[1]);
      };
    };
    astrmify = function(fns, strm, opts, init, id, flush, ext) {
      var t;
      var w = wrkr(fns, init, id, function(err2, dat) {
        if (err2)
          w.terminate(), strm.ondata.call(strm, err2);
        else if (!Array.isArray(dat))
          ext(dat);
        else if (dat.length == 1) {
          strm.queuedSize -= dat[0];
          if (strm.ondrain)
            strm.ondrain(dat[0]);
        } else {
          if (dat[1])
            w.terminate();
          strm.ondata.call(strm, err2, dat[0], dat[1]);
        }
      });
      w.postMessage(opts);
      strm.queuedSize = 0;
      strm.push = function(d, f) {
        if (!strm.ondata)
          err(5);
        if (t)
          strm.ondata(err(4, 0, 1), null, !!f);
        strm.queuedSize += d.length;
        w.postMessage([d, t = f], d.buffer instanceof ArrayBuffer ? [d.buffer] : []);
      };
      strm.terminate = function() {
        w.terminate();
      };
      if (flush) {
        strm.flush = function(sync) {
          w.postMessage([0, sync]);
        };
      }
    };
    b2 = function(d, b) {
      return d[b] | d[b + 1] << 8;
    };
    b4 = function(d, b) {
      return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
    };
    b8 = function(d, b) {
      return b4(d, b) + b4(d, b + 4) * 4294967296;
    };
    wbytes = function(d, b, v) {
      for (; v; ++b)
        d[b] = v, v >>>= 8;
    };
    gzh = function(c, o) {
      var fn = o.filename;
      c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3;
      if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1e3));
      if (fn) {
        c[3] = 8;
        for (var i = 0; i <= fn.length; ++i)
          c[i + 10] = fn.charCodeAt(i);
      }
    };
    gzs = function(d) {
      if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, "invalid gzip data");
      var flg = d[3];
      var st = 10;
      if (flg & 4)
        st += (d[10] | d[11] << 8) + 2;
      for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
      return st + (flg & 2);
    };
    gzl = function(d) {
      var l = d.length;
      return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
    };
    gzhl = function(o) {
      return 10 + (o.filename ? o.filename.length + 1 : 0);
    };
    zlh = function(c, o) {
      var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
      c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
      c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
      if (o.dictionary) {
        var h = adler();
        h.p(o.dictionary);
        wbytes(c, 2, h.d());
      }
    };
    zls = function(d, dict) {
      if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
        err(6, "invalid zlib data");
      if ((d[1] >> 5 & 1) == +!dict)
        err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
      return (d[1] >> 3 & 4) + 2;
    };
    Deflate = /* @__PURE__ */ function() {
      function Deflate2(opts, cb) {
        if (typeof opts == "function")
          cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
        this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
        this.b = new u8(98304);
        if (this.o.dictionary) {
          var dict = this.o.dictionary.subarray(-32768);
          this.b.set(dict, 32768 - dict.length);
          this.s.i = 32768 - dict.length;
        }
      }
      Deflate2.prototype.p = function(c, f) {
        this.ondata(dopt(c, this.o, 0, 0, this.s), f);
      };
      Deflate2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (this.s.l)
          err(4);
        var endLen = chunk.length + this.s.z;
        if (endLen > this.b.length) {
          if (endLen > 2 * this.b.length - 32768) {
            var newBuf = new u8(endLen & -32768);
            newBuf.set(this.b.subarray(0, this.s.z));
            this.b = newBuf;
          }
          var split = this.b.length - this.s.z;
          this.b.set(chunk.subarray(0, split), this.s.z);
          this.s.z = this.b.length;
          this.p(this.b, false);
          this.b.set(this.b.subarray(-32768));
          this.b.set(chunk.subarray(split), 32768);
          this.s.z = chunk.length - split + 32768;
          this.s.i = 32766, this.s.w = 32768;
        } else {
          this.b.set(chunk, this.s.z);
          this.s.z += chunk.length;
        }
        this.s.l = final & 1;
        if (this.s.z > this.s.w + 8191 || final) {
          this.p(this.b, final || false);
          this.s.w = this.s.i, this.s.i -= 2;
        }
        if (final) {
          this.s = this.o = {};
          this.b = et;
        }
      };
      Deflate2.prototype.flush = function(sync) {
        if (!this.ondata)
          err(5);
        if (this.s.l)
          err(4);
        this.p(this.b, false);
        this.s.w = this.s.i, this.s.i -= 2;
        if (sync) {
          var c = new u8(6);
          c[0] = this.s.r >> 3;
          var ep = wfblk(c, this.s.r, et);
          this.s.r = 0;
          this.ondata(c.subarray(0, ep >> 3), false);
        }
      };
      return Deflate2;
    }();
    AsyncDeflate = /* @__PURE__ */ function() {
      function AsyncDeflate2(opts, cb) {
        astrmify([
          bDflt,
          function() {
            return [astrm, Deflate];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Deflate(ev.data);
          onmessage = astrm(strm);
        }, 6, 1);
      }
      return AsyncDeflate2;
    }();
    Inflate = /* @__PURE__ */ function() {
      function Inflate2(opts, cb) {
        if (typeof opts == "function")
          cb = opts, opts = {};
        this.ondata = cb;
        var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
        this.s = { i: 0, b: dict ? dict.length : 0 };
        this.o = new u8(32768);
        this.p = new u8(0);
        if (dict)
          this.o.set(dict);
      }
      Inflate2.prototype.e = function(c) {
        if (!this.ondata)
          err(5);
        if (this.d)
          err(4);
        if (!this.p.length)
          this.p = c;
        else if (c.length) {
          var n = new u8(this.p.length + c.length);
          n.set(this.p), n.set(c, this.p.length), this.p = n;
        }
      };
      Inflate2.prototype.c = function(final) {
        this.s.i = +(this.d = final || false);
        var bts = this.s.b;
        var dt = inflt(this.p, this.s, this.o);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
      };
      Inflate2.prototype.push = function(chunk, final) {
        this.e(chunk), this.c(final);
      };
      return Inflate2;
    }();
    AsyncInflate = /* @__PURE__ */ function() {
      function AsyncInflate2(opts, cb) {
        astrmify([
          bInflt,
          function() {
            return [astrm, Inflate];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Inflate(ev.data);
          onmessage = astrm(strm);
        }, 7, 0);
      }
      return AsyncInflate2;
    }();
    Gzip = /* @__PURE__ */ function() {
      function Gzip2(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
      }
      Gzip2.prototype.push = function(chunk, final) {
        this.c.p(chunk);
        this.l += chunk.length;
        Deflate.prototype.push.call(this, chunk, final);
      };
      Gzip2.prototype.p = function(c, f) {
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, this.s);
        if (this.v)
          gzh(raw, this.o), this.v = 0;
        if (f)
          wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
      };
      Gzip2.prototype.flush = function(sync) {
        Deflate.prototype.flush.call(this, sync);
      };
      return Gzip2;
    }();
    AsyncGzip = /* @__PURE__ */ function() {
      function AsyncGzip2(opts, cb) {
        astrmify([
          bDflt,
          gze,
          function() {
            return [astrm, Deflate, Gzip];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Gzip(ev.data);
          onmessage = astrm(strm);
        }, 8, 1);
      }
      return AsyncGzip2;
    }();
    Gunzip = /* @__PURE__ */ function() {
      function Gunzip2(opts, cb) {
        this.v = 1;
        this.r = 0;
        Inflate.call(this, opts, cb);
      }
      Gunzip2.prototype.push = function(chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        this.r += chunk.length;
        if (this.v) {
          var p = this.p.subarray(this.v - 1);
          var s = p.length > 3 ? gzs(p) : 4;
          if (s > p.length) {
            if (!final)
              return;
          } else if (this.v > 1 && this.onmember) {
            this.onmember(this.r - p.length);
          }
          this.p = p.subarray(s), this.v = 0;
        }
        Inflate.prototype.c.call(this, 0);
        if (this.s.f && !this.s.l) {
          this.v = shft(this.s.p) + 9;
          this.s = { i: 0 };
          this.o = new u8(0);
          this.push(new u8(0), final);
        } else if (final) {
          Inflate.prototype.c.call(this, final);
        }
      };
      return Gunzip2;
    }();
    AsyncGunzip = /* @__PURE__ */ function() {
      function AsyncGunzip2(opts, cb) {
        var _this = this;
        astrmify([
          bInflt,
          guze,
          function() {
            return [astrm, Inflate, Gunzip];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Gunzip(ev.data);
          strm.onmember = function(offset) {
            return postMessage(offset);
          };
          onmessage = astrm(strm);
        }, 9, 0, function(offset) {
          return _this.onmember && _this.onmember(offset);
        });
      }
      return AsyncGunzip2;
    }();
    Zlib = /* @__PURE__ */ function() {
      function Zlib2(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
      }
      Zlib2.prototype.push = function(chunk, final) {
        this.c.p(chunk);
        Deflate.prototype.push.call(this, chunk, final);
      };
      Zlib2.prototype.p = function(c, f) {
        var raw = dopt(c, this.o, this.v && (this.o.dictionary ? 6 : 2), f && 4, this.s);
        if (this.v)
          zlh(raw, this.o), this.v = 0;
        if (f)
          wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
      };
      Zlib2.prototype.flush = function(sync) {
        Deflate.prototype.flush.call(this, sync);
      };
      return Zlib2;
    }();
    AsyncZlib = /* @__PURE__ */ function() {
      function AsyncZlib2(opts, cb) {
        astrmify([
          bDflt,
          zle,
          function() {
            return [astrm, Deflate, Zlib];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Zlib(ev.data);
          onmessage = astrm(strm);
        }, 10, 1);
      }
      return AsyncZlib2;
    }();
    Unzlib = /* @__PURE__ */ function() {
      function Unzlib2(opts, cb) {
        Inflate.call(this, opts, cb);
        this.v = opts && opts.dictionary ? 2 : 1;
      }
      Unzlib2.prototype.push = function(chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
          if (this.p.length < 6 && !final)
            return;
          this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
        }
        if (final) {
          if (this.p.length < 4)
            err(6, "invalid zlib data");
          this.p = this.p.subarray(0, -4);
        }
        Inflate.prototype.c.call(this, final);
      };
      return Unzlib2;
    }();
    AsyncUnzlib = /* @__PURE__ */ function() {
      function AsyncUnzlib2(opts, cb) {
        astrmify([
          bInflt,
          zule,
          function() {
            return [astrm, Inflate, Unzlib];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Unzlib(ev.data);
          onmessage = astrm(strm);
        }, 11, 0);
      }
      return AsyncUnzlib2;
    }();
    Decompress = /* @__PURE__ */ function() {
      function Decompress2(opts, cb) {
        this.o = StrmOpt.call(this, opts, cb) || {};
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
      }
      Decompress2.prototype.i = function() {
        var _this = this;
        this.s.ondata = function(dat, final) {
          _this.ondata(dat, final);
        };
      };
      Decompress2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (!this.s) {
          if (this.p && this.p.length) {
            var n = new u8(this.p.length + chunk.length);
            n.set(this.p), n.set(chunk, this.p.length);
          } else
            this.p = chunk;
          if (this.p.length > 2) {
            this.s = this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8 ? new this.G(this.o) : (this.p[0] & 15) != 8 || this.p[0] >> 4 > 7 || (this.p[0] << 8 | this.p[1]) % 31 ? new this.I(this.o) : new this.Z(this.o);
            this.i();
            this.s.push(this.p, final);
            this.p = null;
          }
        } else
          this.s.push(chunk, final);
      };
      return Decompress2;
    }();
    AsyncDecompress = /* @__PURE__ */ function() {
      function AsyncDecompress2(opts, cb) {
        Decompress.call(this, opts, cb);
        this.queuedSize = 0;
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
      }
      AsyncDecompress2.prototype.i = function() {
        var _this = this;
        this.s.ondata = function(err2, dat, final) {
          _this.ondata(err2, dat, final);
        };
        this.s.ondrain = function(size) {
          _this.queuedSize -= size;
          if (_this.ondrain)
            _this.ondrain(size);
        };
      };
      AsyncDecompress2.prototype.push = function(chunk, final) {
        this.queuedSize += chunk.length;
        Decompress.prototype.push.call(this, chunk, final);
      };
      return AsyncDecompress2;
    }();
    fltn = function(d, p, t, o) {
      for (var k in d) {
        var val = d[k], n = p + k, op = o;
        if (Array.isArray(val))
          op = mrg(o, val[1]), val = val[0];
        if (ArrayBuffer.isView(val))
          t[n] = [val, op];
        else {
          t[n += "/"] = [new u8(0), op];
          fltn(val, n, t, o);
        }
      }
    };
    te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
    td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
    tds = 0;
    try {
      td.decode(et, { stream: true });
      tds = 1;
    } catch (e) {
    }
    dutf8 = function(d) {
      for (var r = "", i = 0; ; ) {
        var c = d[i++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i + eb > d.length)
          return { s: r, r: slc(d, i - 1) };
        if (!eb)
          r += String.fromCharCode(c);
        else if (eb == 3) {
          c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
        } else if (eb & 1)
          r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
        else
          r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
      }
    };
    DecodeUTF8 = /* @__PURE__ */ function() {
      function DecodeUTF82(cb) {
        this.ondata = cb;
        if (tds)
          this.t = new TextDecoder();
        else
          this.p = et;
      }
      DecodeUTF82.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        final = !!final;
        if (this.t) {
          this.ondata(this.t.decode(chunk, { stream: true }), final);
          if (final) {
            if (this.t.decode().length)
              err(8);
            this.t = null;
          }
          return;
        }
        if (!this.p)
          err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
        if (final) {
          if (r.length)
            err(8);
          this.p = null;
        } else
          this.p = r;
        this.ondata(s, final);
      };
      return DecodeUTF82;
    }();
    EncodeUTF8 = /* @__PURE__ */ function() {
      function EncodeUTF82(cb) {
        this.ondata = cb;
      }
      EncodeUTF82.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (this.d)
          err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
      };
      return EncodeUTF82;
    }();
    dbf = function(l) {
      return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0;
    };
    slzh = function(d, b) {
      return b + 30 + b2(d, b + 26) + b2(d, b + 28);
    };
    zh = function(d, b, z) {
      var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
      var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
      return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
    };
    z64hs = function(d, b, l, z, sc, su, off) {
      var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
      var nf = nsc + nsu + noff;
      if (z && nf) {
        for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
          if (b2(d, b) == 1) {
            return [
              nsc ? b8(d, b + 4 + 8 * nsu) : sc,
              nsu ? b8(d, b + 4) : su,
              noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
              1
            ];
          }
        }
        if (z < 2)
          err(13);
      }
      return [sc, su, off, 0];
    };
    exfl = function(ex) {
      var le = 0;
      if (ex) {
        for (var k in ex) {
          var l = ex[k].length;
          if (l > 65535)
            err(9);
          le += l + 4;
        }
      }
      return le;
    };
    wzh = function(d, b, f, fn, u, c, ce, co) {
      var fl2 = fn.length, ex = f.extra, col = co && co.length;
      var exl = exfl(ex);
      wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
      if (ce != null)
        d[b++] = 20, d[b++] = f.os;
      d[b] = 20, b += 2;
      d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
      d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
      var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
      if (y < 0 || y > 119)
        err(10);
      wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
      if (c != -1) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c < 0 ? -c - 2 : c);
        wbytes(d, b + 8, f.size);
      }
      wbytes(d, b + 12, fl2);
      wbytes(d, b + 14, exl), b += 16;
      if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
      }
      d.set(fn, b);
      b += fl2;
      if (exl) {
        for (var k in ex) {
          var exf = ex[k], l = exf.length;
          wbytes(d, b, +k);
          wbytes(d, b + 2, l);
          d.set(exf, b + 4), b += 4 + l;
        }
      }
      if (col)
        d.set(co, b), b += col;
      return b;
    };
    wzf = function(o, b, c, d, e) {
      wbytes(o, b, 101010256);
      wbytes(o, b + 8, c);
      wbytes(o, b + 10, c);
      wbytes(o, b + 12, d);
      wbytes(o, b + 16, e);
    };
    ZipPassThrough = /* @__PURE__ */ function() {
      function ZipPassThrough2(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
      }
      ZipPassThrough2.prototype.process = function(chunk, final) {
        this.ondata(null, chunk, final);
      };
      ZipPassThrough2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
          this.crc = this.c.d();
        this.process(chunk, final || false);
      };
      return ZipPassThrough2;
    }();
    ZipDeflate = /* @__PURE__ */ function() {
      function ZipDeflate2(filename, opts) {
        var _this = this;
        if (!opts)
          opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function(dat, final) {
          _this.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
      }
      ZipDeflate2.prototype.process = function(chunk, final) {
        try {
          this.d.push(chunk, final);
        } catch (e) {
          this.ondata(e, null, final);
        }
      };
      ZipDeflate2.prototype.push = function(chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
      };
      return ZipDeflate2;
    }();
    AsyncZipDeflate = /* @__PURE__ */ function() {
      function AsyncZipDeflate2(filename, opts) {
        var _this = this;
        if (!opts)
          opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function(err2, dat, final) {
          _this.ondata(err2, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
      }
      AsyncZipDeflate2.prototype.process = function(chunk, final) {
        this.d.push(chunk, final);
      };
      AsyncZipDeflate2.prototype.push = function(chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
      };
      return AsyncZipDeflate2;
    }();
    Zip = /* @__PURE__ */ function() {
      function Zip2(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
      }
      Zip2.prototype.add = function(file2) {
        var _this = this;
        if (!this.ondata)
          err(5);
        if (this.d & 2)
          this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
          var f = strToU8(file2.filename), fl_1 = f.length;
          var com = file2.comment, o = com && strToU8(com);
          var u = fl_1 != file2.filename.length || o && com.length != o.length;
          var hl_1 = fl_1 + exfl(file2.extra) + 30;
          if (fl_1 > 65535)
            this.ondata(err(11, 0, 1), null, false);
          var header = new u8(hl_1);
          wzh(header, 0, file2, f, u, -1);
          var chks_1 = [header];
          var pAll_1 = function() {
            for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
              var chk = chks_2[_i];
              _this.ondata(null, chk, false);
            }
            chks_1 = [];
          };
          var tr_1 = this.d;
          this.d = 0;
          var ind_1 = this.u.length;
          var uf_1 = mrg(file2, {
            f,
            u,
            o,
            t: function() {
              if (file2.terminate)
                file2.terminate();
            },
            r: function() {
              pAll_1();
              if (tr_1) {
                var nxt = _this.u[ind_1 + 1];
                if (nxt)
                  nxt.r();
                else
                  _this.d = 1;
              }
              tr_1 = 1;
            }
          });
          var cl_1 = 0;
          file2.ondata = function(err2, dat, final) {
            if (err2) {
              _this.ondata(err2, dat, final);
              _this.terminate();
            } else {
              cl_1 += dat.length;
              chks_1.push(dat);
              if (final) {
                var dd = new u8(16);
                wbytes(dd, 0, 134695760);
                wbytes(dd, 4, file2.crc);
                wbytes(dd, 8, cl_1);
                wbytes(dd, 12, file2.size);
                chks_1.push(dd);
                uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file2.crc, uf_1.size = file2.size;
                if (tr_1)
                  uf_1.r();
                tr_1 = 1;
              } else if (tr_1)
                pAll_1();
            }
          };
          this.u.push(uf_1);
        }
      };
      Zip2.prototype.end = function() {
        var _this = this;
        if (this.d & 2) {
          this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
          return;
        }
        if (this.d)
          this.e();
        else
          this.u.push({
            r: function() {
              if (!(_this.d & 1))
                return;
              _this.u.splice(-1, 1);
              _this.e();
            },
            t: function() {
            }
          });
        this.d = 3;
      };
      Zip2.prototype.e = function() {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
          var f = _a2[_i];
          tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b2 = 0, _c = this.u; _b2 < _c.length; _b2++) {
          var f = _c[_b2];
          wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
          bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
      };
      Zip2.prototype.terminate = function() {
        for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
          var f = _a2[_i];
          f.t();
        }
        this.d = 2;
      };
      return Zip2;
    }();
    UnzipPassThrough = /* @__PURE__ */ function() {
      function UnzipPassThrough2() {
      }
      UnzipPassThrough2.prototype.push = function(chunk, final) {
        this.ondata(null, chunk, final);
      };
      UnzipPassThrough2.compression = 0;
      return UnzipPassThrough2;
    }();
    UnzipInflate = /* @__PURE__ */ function() {
      function UnzipInflate2() {
        var _this = this;
        this.i = new Inflate(function(dat, final) {
          _this.ondata(null, dat, final);
        });
      }
      UnzipInflate2.prototype.push = function(chunk, final) {
        try {
          this.i.push(chunk, final);
        } catch (e) {
          this.ondata(e, null, final);
        }
      };
      UnzipInflate2.compression = 8;
      return UnzipInflate2;
    }();
    AsyncUnzipInflate = /* @__PURE__ */ function() {
      function AsyncUnzipInflate2(_, sz) {
        var _this = this;
        if (sz < 32e4) {
          this.i = new Inflate(function(dat, final) {
            _this.ondata(null, dat, final);
          });
        } else {
          this.i = new AsyncInflate(function(err2, dat, final) {
            _this.ondata(err2, dat, final);
          });
          this.terminate = this.i.terminate;
        }
      }
      AsyncUnzipInflate2.prototype.push = function(chunk, final) {
        if (this.i.terminate)
          chunk = slc(chunk, 0);
        this.i.push(chunk, final);
      };
      AsyncUnzipInflate2.compression = 8;
      return AsyncUnzipInflate2;
    }();
    Unzip = /* @__PURE__ */ function() {
      function Unzip2(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
          0: UnzipPassThrough
        };
        this.p = et;
      }
      Unzip2.prototype.push = function(chunk, final) {
        var _this = this;
        if (!this.onfile)
          err(5);
        if (!this.p)
          err(4);
        if (this.c > 0) {
          var len = Math.min(this.c, chunk.length);
          var toAdd = chunk.subarray(0, len);
          this.c -= len;
          if (this.d)
            this.d.push(toAdd, !this.c);
          else
            this.k[0].push(toAdd);
          chunk = chunk.subarray(len);
          if (chunk.length)
            return this.push(chunk, final);
        } else {
          var f = 0, i = 0, is = void 0, buf = void 0;
          if (!this.p.length)
            buf = chunk;
          else if (!chunk.length)
            buf = this.p;
          else {
            buf = new u8(this.p.length + chunk.length);
            buf.set(this.p), buf.set(chunk, this.p.length);
          }
          var l = buf.length, oc = this.c, add = oc && this.d;
          var _loop_2 = function() {
            var sig = b4(buf, i);
            if (sig == 67324752) {
              f = 1, is = i;
              this_1.d = null;
              this_1.c = 0;
              var bf = b2(buf, i + 6), cmp_1 = b2(buf, i + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i + 26), es = b2(buf, i + 28);
              if (l > i + 30 + fnl + es) {
                var chks_3 = [];
                this_1.k.unshift(chks_3);
                f = 2;
                var lsc = b4(buf, i + 18), lsu = b4(buf, i + 22);
                var fn_1 = strFromU8(buf.subarray(i + 30, i += 30 + fnl), !u);
                var _a2 = z64hs(buf, i, es, 2, lsc, lsu, 0), sc_1 = _a2[0], su_1 = _a2[1], z64 = _a2[3];
                if (dd)
                  sc_1 = -1 - z64;
                i += es;
                this_1.c = sc_1;
                var d_1;
                var file_1 = {
                  name: fn_1,
                  compression: cmp_1,
                  start: function() {
                    if (!file_1.ondata)
                      err(5);
                    if (!sc_1)
                      file_1.ondata(null, et, true);
                    else {
                      var ctr = _this.o[cmp_1];
                      if (!ctr)
                        file_1.ondata(err(14, "unknown compression type " + cmp_1, 1), null, false);
                      d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                      d_1.ondata = function(err2, dat3, final2) {
                        file_1.ondata(err2, dat3, final2);
                      };
                      for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                        var dat2 = chks_4[_i];
                        d_1.push(dat2, false);
                      }
                      if (_this.k[0] == chks_3 && _this.c)
                        _this.d = d_1;
                      else
                        d_1.push(et, true);
                    }
                  },
                  terminate: function() {
                    if (d_1 && d_1.terminate)
                      d_1.terminate();
                  }
                };
                if (sc_1 >= 0)
                  file_1.size = sc_1, file_1.originalSize = su_1;
                this_1.onfile(file_1);
              }
              return "break";
            } else if (oc) {
              if (sig == 134695760) {
                is = i += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                return "break";
              } else if (sig == 33639248) {
                is = i -= 4, f = 3, this_1.c = 0;
                return "break";
              }
            }
          };
          var this_1 = this;
          for (; i < l - 4; ++i) {
            var state_1 = _loop_2();
            if (state_1 === "break")
              break;
          }
          this.p = et;
          if (oc < 0) {
            var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 134695760 && 4)) : buf.subarray(0, i);
            if (add)
              add.push(dat, !!f);
            else
              this.k[+(f == 2)].push(dat);
          }
          if (f & 2)
            return this.push(buf.subarray(i), final);
          this.p = buf.subarray(i);
        }
        if (final) {
          if (this.c)
            err(13);
          this.p = null;
        }
      };
      Unzip2.prototype.register = function(decoder2) {
        this.o[decoder2.compression] = decoder2;
      };
      return Unzip2;
    }();
    mt = typeof queueMicrotask == "function" ? queueMicrotask : typeof setTimeout == "function" ? setTimeout : function(fn) {
      fn();
    };
  }
});

// src/lib/extensions/blobStore.ts
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve2, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const req2 = indexedDB.open(DB_NAME, VERSION);
    req2.onupgradeneeded = () => {
      const db = req2.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req2.onsuccess = () => resolve2(req2.result);
    req2.onerror = () => reject(req2.error);
  });
  return dbPromise;
}
function req(r) {
  return new Promise((resolve2, reject) => {
    r.onsuccess = () => resolve2(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function getVsix(id) {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const row = await req(tx.objectStore(STORE).get(id));
    return row ? row.bytes : null;
  } catch {
    return null;
  }
}
var DB_NAME, STORE, VERSION, dbPromise;
var init_blobStore = __esm({
  "src/lib/extensions/blobStore.ts"() {
    "use strict";
    DB_NAME = "nova-ext-store";
    STORE = "vsix";
    VERSION = 1;
    dbPromise = null;
  }
});

// src/lib/vsixParser.ts
var vsixParser_exports = {};
__export(vsixParser_exports, {
  cacheParsedVsix: () => cacheParsedVsix,
  dropParsedVsix: () => dropParsedVsix,
  getParsedVsix: () => getParsedVsix,
  loadParsedVsixFromStore: () => loadParsedVsixFromStore,
  parseVsix: () => parseVsix,
  themeToExtTheme: () => themeToExtTheme
});
function ruleColor(rules, names) {
  for (const r of rules) {
    if (!r.foreground) continue;
    const tokens = r.token.split(/[.,\s]+/).filter(Boolean);
    if (names.some((n) => tokens.includes(n))) return r.foreground;
  }
  return null;
}
function themeToExtTheme(id, label, themeJson) {
  const dark = (themeJson.type || "dark") !== "light";
  const base = dark ? "vs-dark" : "vs";
  const rules = (themeJson.tokenColors || []).map((tc) => {
    const scope = Array.isArray(tc.scope) ? tc.scope.join(", ") : String(tc.scope || "");
    return {
      token: scope,
      foreground: tc.settings?.foreground,
      fontStyle: tc.settings?.fontStyle
    };
  }).filter((r) => r.token && (r.foreground || r.fontStyle));
  const colors = { ...themeJson.colors || {} };
  if (!colors["editor.background"]) colors["editor.background"] = dark ? "#0f111a" : "#fafbfe";
  if (!colors["editor.foreground"]) colors["editor.foreground"] = dark ? "#d5d9e6" : "#263238";
  if (!colors["editorCursor.foreground"]) {
    colors["editorCursor.foreground"] = ruleColor(rules, ["keyword", "storage"]) || (dark ? "#82aaff" : "#2962ff");
  }
  colors["nova.string"] = ruleColor(rules, ["string"]) || (dark ? "#a5e075" : "#689f38");
  colors["nova.number"] = ruleColor(rules, ["number"]) || (dark ? "#f78c6c" : "#e65100");
  colors["nova.keyword"] = ruleColor(rules, ["keyword", "storage"]) || (dark ? "#c792ea" : "#b072d1");
  colors["nova.delimiter"] = ruleColor(rules, ["delimiter", "operator"]) || (dark ? "#89ddff" : "#00838f");
  colors["nova.type"] = ruleColor(rules, ["type", "support.type"]) || (dark ? "#82aaff" : "#2962ff");
  return { id, label, base, colors, rules };
}
function stripLeadingSlash(p) {
  return p.replace(/^\.?\//, "");
}
function parseVsix(bytes, id) {
  let files;
  try {
    files = unzipSync(bytes);
  } catch (e) {
    throw new Error(`No se pudo descomprimir el .vsix: ${e.message}`);
  }
  const readText2 = (p) => {
    const b = files[p];
    if (!b) return null;
    try {
      return strFromU8(b);
    } catch {
      return null;
    }
  };
  const pkgRaw = readText2("extension/package.json");
  if (!pkgRaw) throw new Error("No se encontr\xF3 extension/package.json en el .vsix");
  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch {
    throw new Error("El package.json del .vsix no es JSON v\xE1lido");
  }
  const contributes = pkg.contributes || {};
  const publisher = String(pkg.publisher || "unknown");
  const name = String(pkg.name || "unknown");
  const tree = {};
  for (const [path, data] of Object.entries(files)) {
    if (path === "extension/package.json") continue;
    if (path.startsWith("extension/")) tree[path.slice("extension/".length)] = data;
    else tree[path] = data;
  }
  const themes = [];
  for (const t of contributes.themes || []) {
    if (!t.path) continue;
    const raw = readText2(`extension/${stripLeadingSlash(t.path)}`);
    if (!raw) continue;
    try {
      const themeJson = JSON.parse(raw);
      themes.push(
        themeToExtTheme(
          `ext-theme-${publisher}-${name}-${t.id || t.label || themes.length}`,
          t.label || t.id || "Tema",
          themeJson
        )
      );
    } catch {
    }
  }
  const snippets = [];
  for (const s of contributes.snippets || []) {
    if (!s.path || !s.language) continue;
    const raw = readText2(`extension/${stripLeadingSlash(s.path)}`);
    if (!raw) continue;
    try {
      const snip = JSON.parse(raw);
      const items = Object.entries(snip).filter(([, d]) => d && d.body).map(([sname, d]) => ({
        label: Array.isArray(d.prefix) ? d.prefix[0] : d.prefix || sname,
        detail: d.description || sname,
        description: d.description,
        insertText: Array.isArray(d.body) ? d.body.join("\n") : String(d.body)
      }));
      if (items.length) snippets.push({ language: s.language, items });
    } catch {
    }
  }
  const mainEntry = typeof pkg.main === "string" ? pkg.main : null;
  let code;
  if (mainEntry) {
    const raw = readText2(`extension/${stripLeadingSlash(mainEntry)}`);
    if (raw && raw.length <= 3e6) code = raw;
  }
  const result = {
    id: `${publisher}.${name}`,
    publisher,
    name,
    displayName: String(pkg.displayName || pkg.name || `${publisher}.${name}`),
    version: String(pkg.version || "1.0.0"),
    description: pkg.description ? String(pkg.description) : void 0,
    engines: pkg.engines,
    pkg,
    main: mainEntry,
    files: tree,
    themes,
    snippets,
    code
  };
  if (id) cache.set(id, result);
  return result;
}
function getParsedVsix(id) {
  return cache.get(id);
}
function cacheParsedVsix(id, parsed) {
  cache.set(id, parsed);
}
function dropParsedVsix(id) {
  cache.delete(id);
}
async function loadParsedVsixFromStore(id) {
  const cached = cache.get(id);
  if (cached) return cached;
  const bytes = await getVsix(id);
  if (!bytes) return null;
  try {
    return parseVsix(bytes, id);
  } catch {
    return null;
  }
}
var cache;
var init_vsixParser = __esm({
  "src/lib/vsixParser.ts"() {
    "use strict";
    init_esm();
    init_blobStore();
    cache = /* @__PURE__ */ new Map();
  }
});

// scripts/ext-test/stubs/zustand.ts
function create(initializer) {
  const api = {};
  let state;
  const set = (partial) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...next };
    return state;
  };
  const get = () => state;
  state = initializer(set, get, api);
  api.getState = get;
  api.setState = set;
  api.subscribe = () => () => {
  };
  return api;
}
var init_zustand = __esm({
  "scripts/ext-test/stubs/zustand.ts"() {
    "use strict";
  }
});

// src/lib/electronBridge.ts
function desktopFs() {
  return window.novaDesktop?.fs ?? null;
}
var init_electronBridge = __esm({
  "src/lib/electronBridge.ts"() {
    "use strict";
  }
});

// src/lib/fileSystem.ts
var fileSystem_exports = {};
__export(fileSystem_exports, {
  buildDemoFileMap: () => buildDemoFileMap,
  createDemoRoot: () => createDemoRoot,
  createDirAt: () => createDirAt,
  createEntry: () => createEntry,
  createFileAt: () => createFileAt,
  currentBackend: () => currentBackend,
  deleteEntry: () => deleteEntry,
  emitFsChange: () => emitFsChange,
  fsSupported: () => fsSupported,
  getChildHandle: () => getChildHandle,
  isDirectoryAt: () => isDirectoryAt,
  isFileAt: () => isFileAt,
  listAt: () => listAt,
  listChildren: () => listChildren,
  nodeFromHandle: () => nodeFromHandle,
  normalizeRelPath: () => normalizeRelPath,
  openWorkspace: () => openWorkspace,
  openWorkspaceAt: () => openWorkspaceAt,
  parentHandleOf: () => parentHandleOf,
  readFileAt: () => readFileAt,
  readText: () => readText,
  removeAt: () => removeAt,
  renameEntry: () => renameEntry,
  requestPermission: () => requestPermission,
  resolvePath: () => resolvePath,
  setBackend: () => setBackend,
  walkFiles: () => walkFiles,
  writeFileAt: () => writeFileAt,
  writeText: () => writeText
});
function emitFsChange(kind, path) {
  window.dispatchEvent(new CustomEvent("nova:fs-change", { detail: { kind, path } }));
}
function fsSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
function currentBackend() {
  return backendKind;
}
function setBackend(kind) {
  backendKind = kind;
}
function joinAbs(base, name) {
  return base.replace(/[\\/]+$/, "") + "/" + name;
}
function displayRel(rootAbs, abs) {
  const a = rootAbs.replace(/\\/g, "/").replace(/\/+$/, "");
  const b = abs.replace(/\\/g, "/");
  if (b.startsWith(a + "/")) return b.slice(a.length + 1);
  return b;
}
async function requestPermission(handle) {
  const perm = handle;
  const opts = { mode: "readwrite" };
  try {
    if (perm.queryPermission) {
      const p = await perm.queryPermission(opts);
      if (p === "granted") return true;
      if (perm.requestPermission) {
        const r = await perm.requestPermission(opts);
        return r === "granted";
      }
      return true;
    }
  } catch {
  }
  return true;
}
async function openWorkspace() {
  const dFs = desktopFs();
  if (dFs) {
    const abs = await dFs.openWorkspace();
    if (!abs) {
      const err2 = new Error("Operaci\xF3n cancelada");
      err2.name = "AbortError";
      throw err2;
    }
    backendKind = "desktop";
    const name = abs.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || abs;
    const handle = { kind: "directory", name, absPath: abs };
    await dFs.setWorkspace(abs);
    return { root: toNode(handle, ""), demo: false };
  }
  if (fsSupported()) {
    const dirHandle = await window.showDirectoryPicker();
    const ok = await requestPermission(dirHandle);
    if (!ok) throw new Error("Permiso denegado para leer el directorio");
    backendKind = "native";
    return { root: toNode(dirHandle, ""), demo: false };
  }
  backendKind = "virtual";
  return { root: createDemoRoot(), demo: true };
}
async function openWorkspaceAt(absPath) {
  const dFs = desktopFs();
  if (!dFs) throw new Error("Funcionalidad solo disponible en el escritorio");
  backendKind = "desktop";
  await dFs.setWorkspace(absPath);
  const name = absPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || absPath;
  const handle = { kind: "directory", name, absPath };
  return { root: toNode(handle, ""), demo: false };
}
function createDemoRoot() {
  const root = { kind: "directory", name: "demo-project", entries: /* @__PURE__ */ new Map() };
  const src = dir(root, "src");
  const comps = dir(src, "components");
  file(comps, "Button.tsx", `import React from 'react'

interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={'btn btn--' + variant} onClick={onClick}>
      {label}
    </button>
  )
}
`);
  file(comps, "Header.tsx", `import React from 'react'

export function Header() {
  return (
    <header className="app-header">
      <h1>Bienvenido a Nova</h1>
    </header>
  )
}
`);
  file(src, "App.tsx", `import React from 'react'
import { Header } from './components/Header'
import { Button } from './components/Button'

export default function App() {
  return (
    <main className="app">
      <Header />
      <Button label="Haz clic" onClick={() => alert('Hola desde Nova!')} />
    </main>
  )
}
`);
  file(src, "main.tsx", `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
`);
  file(root, "package.json", `{
  "name": "demo-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.0.0"
  }
}
`);
  file(root, "tsconfig.json", `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  }
}
`);
  file(root, "README.md", `# Proyecto Demo

Este es un proyecto de ejemplo creado por **Nova**.

Para probar el editor con tus propios archivos, abre una carpeta real
con el bot\xF3n "Abrir carpeta" del panel de exploraci\xF3n.

## Atajos \xFAtiles
- Ctrl+P \u2014 Abrir archivo
- Ctrl+Shift+P \u2014 Paleta de comandos
- Ctrl+S \u2014 Guardar archivo
- Ctrl+Shift+F \u2014 Buscar en archivos
- Ctrl+B \u2014 Ocultar barra lateral
- Ctrl+J \u2014 Abrir IA
`);
  return toNode(root, "");
}
function dir(parent, name) {
  const d = { kind: "directory", name, entries: /* @__PURE__ */ new Map() };
  parent.entries.set(name, d);
  return d;
}
function file(parent, name, content) {
  parent.entries.set(name, { kind: "file", name, content, mtime: Date.now() });
}
function toNode(handle, parentPath) {
  const path = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  if (handle.kind === "file") {
    return { name: handle.name, path, kind: "file", handle };
  }
  return { name: handle.name, path, kind: "directory", children: [], loaded: false, expanded: false, handle };
}
function nodeFromHandle(handle) {
  return toNode(handle, "");
}
async function listChildren(node) {
  if (backendKind === "desktop") {
    const handle = node.handle;
    const entries = await desktopFs().list(handle.absPath);
    return sortNodes(entries.map((e) => toNode(e, node.path)));
  }
  if (backendKind === "native") {
    const handle = node.handle;
    await requestPermission(handle);
    const out2 = [];
    for await (const entry of asyncEntries(handle)) {
      out2.push(toNode(entry, node.path));
    }
    return sortNodes(out2);
  }
  const dir2 = node.handle;
  const out = [];
  if (dir2 && dir2.entries) {
    for (const entry of dir2.entries.values()) {
      out.push(toNode(entry, node.path));
    }
  }
  return sortNodes(out);
}
function sortNodes(out) {
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
async function readText(fileHandle) {
  if (backendKind === "desktop") {
    const handle = fileHandle;
    return await desktopFs().readFile(handle.absPath);
  }
  if (backendKind === "native") {
    const handle = fileHandle;
    await requestPermission(handle);
    const f = await handle.getFile();
    return await f.text();
  }
  const vf = fileHandle;
  return vf.content;
}
async function writeText(fileHandle, content) {
  if (backendKind === "desktop") {
    const handle = fileHandle;
    await desktopFs().writeFile(handle.absPath, content);
    return;
  }
  if (backendKind === "native") {
    const handle = fileHandle;
    await requestPermission(handle);
    const w = await handle.createWritable();
    await w.write(content);
    await w.close();
    return;
  }
  const vf = fileHandle;
  vf.content = content;
  vf.mtime = Date.now();
}
async function createEntry(parentHandle, name, kind) {
  if (backendKind === "desktop") {
    const handle = parentHandle;
    const entry = await desktopFs().create(handle.absPath, name, kind);
    return toNode(entry, parentPathOf(parentHandle));
  }
  if (backendKind === "native") {
    const handle = parentHandle;
    await requestPermission(handle);
    if (kind === "file") {
      const fh = await handle.getFileHandle(name, { create: true });
      return toNode(fh, parentPathOf(parentHandle));
    }
    const dh = await handle.getDirectoryHandle(name, { create: true });
    return toNode(dh, parentPathOf(parentHandle));
  }
  const dir2 = parentHandle;
  if (dir2.entries.has(name)) throw new Error(`Ya existe "${name}"`);
  if (kind === "file") {
    const vf = { kind: "file", name, content: "", mtime: Date.now() };
    dir2.entries.set(name, vf);
    return toNode(vf, parentPathOf(parentHandle));
  }
  const vd = { kind: "directory", name, entries: /* @__PURE__ */ new Map() };
  dir2.entries.set(name, vd);
  return toNode(vd, parentPathOf(parentHandle));
}
function parentPathOf(handle) {
  const dir2 = handle;
  return dir2.name === "demo-project" ? "" : dir2.name;
}
async function deleteEntry(parentHandle, name) {
  if (backendKind === "desktop") {
    const handle = parentHandle;
    await desktopFs().remove(joinAbs(handle.absPath, name));
    return;
  }
  if (backendKind === "native") {
    const handle = parentHandle;
    await requestPermission(handle);
    await handle.removeEntry(name, { recursive: true });
    return;
  }
  const dir2 = parentHandle;
  dir2.entries.delete(name);
}
async function renameEntry(parentHandle, oldName, newName) {
  if (backendKind === "desktop") {
    const handle = parentHandle;
    await desktopFs().rename(handle.absPath, oldName, newName);
    return;
  }
  if (backendKind === "native") {
    const dir3 = parentHandle;
    await requestPermission(dir3);
    let child = null;
    try {
      child = await dir3.getFileHandle(oldName);
    } catch {
      try {
        child = await dir3.getDirectoryHandle(oldName);
      } catch {
        throw new Error(`No se encontr\xF3 "${oldName}"`);
      }
    }
    const movable = child;
    if (!movable.move) throw new Error("Renombrar no est\xE1 soportado en este navegador");
    await movable.move(newName);
    return;
  }
  const dir2 = parentHandle;
  const entry = dir2.entries.get(oldName);
  if (!entry) throw new Error(`No se encontr\xF3 "${oldName}"`);
  dir2.entries.delete(oldName);
  entry.name = newName;
  dir2.entries.set(newName, entry);
}
async function walkFiles(dirHandle, onFile) {
  if (backendKind === "desktop") {
    const handle = dirHandle;
    const rootName = handle.name;
    const rootAbs = handle.absPath;
    const files = await desktopFs().walk(rootAbs);
    for (const abs of files) {
      const rel = displayRel(rootAbs, abs);
      const disp = rootName ? `${rootName}/${rel}` : rel;
      const name = abs.split(/[\\/]/).pop() || abs;
      onFile(disp, { kind: "file", name, absPath: abs });
    }
    return;
  }
  const entries = await listAny(dirHandle);
  for (const entry of entries) {
    const p = `${dirHandle.name}/${entry.name}`.replace(/^\/+/, "");
    const real = entry.handle || entry;
    if (entry.kind === "file") {
      onFile(p, real);
    } else {
      await walkFiles(real, (fp, fh) => onFile(`${dirHandle.name}/${fp}`.replace(/^\/+/, ""), fh));
    }
  }
}
async function listAny(dirHandle) {
  if (backendKind === "native") {
    const handle = dirHandle;
    await requestPermission(handle);
    const out2 = [];
    for await (const entry of asyncEntries(handle)) {
      out2.push({ name: entry.name, kind: entry.kind });
    }
    return out2;
  }
  const dir2 = dirHandle;
  const out = [];
  if (dir2 && dir2.entries) {
    for (const entry of dir2.entries.values()) {
      out.push({ name: entry.name, kind: entry.kind, handle: entry });
    }
  }
  return out;
}
function buildDemoFileMap() {
  const map = /* @__PURE__ */ new Map();
  const root = createDemoRoot();
  const walk = (prefix, d) => {
    for (const [, v] of d.entries) {
      const p = prefix ? `${prefix}/${v.name}` : v.name;
      if (v.kind === "file") map.set(p, v);
      else walk(p, v);
    }
  };
  walk("", root.handle);
  return map;
}
async function getChildHandle(dirHandle, name) {
  if (backendKind === "desktop") {
    const dir3 = dirHandle;
    return await desktopFs().stat(joinAbs(dir3.absPath, name));
  }
  if (backendKind === "native") {
    const dir3 = dirHandle;
    try {
      return await dir3.getFileHandle(name);
    } catch {
      try {
        return await dir3.getDirectoryHandle(name);
      } catch {
        return null;
      }
    }
  }
  const dir2 = dirHandle;
  return dir2.entries.get(name) || null;
}
function normalizeRelPath(path) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
function collapsePath(path) {
  const parts = normalizeRelPath(path).split("/").filter(Boolean);
  const stack = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      stack.pop();
      continue;
    }
    stack.push(p);
  }
  return stack;
}
async function resolvePath(rootHandle, path) {
  const parts = collapsePath(path);
  let cur = rootHandle;
  for (const part of parts) {
    if (cur.kind !== "directory") return null;
    const child = await getChildHandle(cur, part);
    if (!child) return null;
    cur = child;
  }
  return cur;
}
async function parentHandleOf(handle) {
  if (backendKind === "native") {
    const dir2 = handle;
    return dir2.parent ?? null;
  }
  const root = handle;
  const findParent = (current, target) => {
    for (const [, v] of current.entries) {
      if (v === target) return current;
      if (v.kind === "directory") {
        const found = findParent(v, target);
        if (found) return found;
      }
    }
    return null;
  };
  const demoRoot = createDemoRoot().handle;
  return findParent(demoRoot, root);
}
async function listAt(dirHandle, path) {
  const target = await resolvePath(dirHandle, path);
  if (!target || target.kind !== "directory") return null;
  if (backendKind === "desktop") {
    const dir2 = target;
    const entries = await desktopFs().list(dir2.absPath);
    return entries.map((e) => ({ name: e.name, kind: e.kind, handle: e }));
  }
  if (backendKind === "native") {
    const dir2 = target;
    await requestPermission(dir2);
    const out2 = [];
    for await (const entry of asyncEntries(dir2)) {
      out2.push({ name: entry.name, kind: entry.kind, handle: entry });
    }
    return sortList(out2);
  }
  const vdir = target;
  const out = [];
  if (vdir && vdir.entries) {
    for (const v of vdir.entries.values()) {
      out.push({ name: v.name, kind: v.kind, handle: v });
    }
  }
  return sortList(out);
}
function sortList(out) {
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
async function readFileAt(dirHandle, path) {
  const target = await resolvePath(dirHandle, path);
  if (!target || target.kind !== "file") return null;
  return await readText(target);
}
async function writeFileAt(dirHandle, path, content) {
  const target = await resolvePath(dirHandle, path);
  if (!target || target.kind !== "file") return false;
  await writeText(target, content);
  emitFsChange("changed", normalizeRelPath(path));
  return true;
}
async function createFileAt(dirHandle, path, content = "") {
  const parts = normalizeRelPath(path).split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return false;
  const parent = await resolvePath(dirHandle, parts.join("/"));
  if (!parent || parent.kind !== "directory") return false;
  if (backendKind === "desktop") {
    const dir2 = parent;
    await desktopFs().create(dir2.absPath, name, "file");
    if (content) await desktopFs().writeFile(joinAbs(dir2.absPath, name), content);
    return true;
  }
  if (backendKind === "native") {
    const dir2 = parent;
    await requestPermission(dir2);
    const fh = await dir2.getFileHandle(name, { create: true });
    if (content) await writeText(fh, content);
    return true;
  }
  const vdir = parent;
  if (vdir.entries.has(name)) return false;
  vdir.entries.set(name, { kind: "file", name, content, mtime: Date.now() });
  emitFsChange("created", normalizeRelPath(path));
  return true;
}
async function createDirAt(dirHandle, path) {
  const parts = normalizeRelPath(path).split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return false;
  const parent = await resolvePath(dirHandle, parts.join("/"));
  if (!parent || parent.kind !== "directory") return false;
  if (backendKind === "desktop") {
    const dir2 = parent;
    await desktopFs().create(dir2.absPath, name, "directory");
    return true;
  }
  if (backendKind === "native") {
    const dir2 = parent;
    await requestPermission(dir2);
    await dir2.getDirectoryHandle(name, { create: true });
    return true;
  }
  const vdir = parent;
  if (vdir.entries.has(name)) return false;
  vdir.entries.set(name, { kind: "directory", name, entries: /* @__PURE__ */ new Map() });
  emitFsChange("created", normalizeRelPath(path));
  return true;
}
async function removeAt(dirHandle, path) {
  const parts = normalizeRelPath(path).split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return false;
  const parent = await resolvePath(dirHandle, parts.join("/"));
  if (!parent || parent.kind !== "directory") return false;
  if (backendKind === "desktop") {
    const dir2 = parent;
    await desktopFs().remove(joinAbs(dir2.absPath, name));
    return true;
  }
  if (backendKind === "native") {
    const dir2 = parent;
    await requestPermission(dir2);
    await dir2.removeEntry(name, { recursive: true });
    return true;
  }
  const vdir = parent;
  const ok = vdir.entries.delete(name);
  if (ok) emitFsChange("deleted", normalizeRelPath(path));
  return ok;
}
async function isDirectoryAt(dirHandle, path) {
  const target = await resolvePath(dirHandle, path);
  return !!target && target.kind === "directory";
}
async function isFileAt(dirHandle, path) {
  const target = await resolvePath(dirHandle, path);
  return !!target && target.kind === "file";
}
function asyncEntries(handle) {
  return handle;
}
var backendKind;
var init_fileSystem = __esm({
  "src/lib/fileSystem.ts"() {
    "use strict";
    init_electronBridge();
    backendKind = "native";
  }
});

// scripts/ext-test/stubs/monaco.ts
var init_monaco = __esm({
  "scripts/ext-test/stubs/monaco.ts"() {
    "use strict";
  }
});

// src/lib/extensions/languageRegistry.ts
function lookupContributedLanguage(path) {
  const name = path.split(/[\\/]/).pop() || path;
  const byName = nameMap.get(name.toLowerCase());
  if (byName) return byName;
  const i = name.lastIndexOf(".");
  if (i >= 0) return extMap.get(name.slice(i).toLowerCase());
  return void 0;
}
var extMap, nameMap;
var init_languageRegistry = __esm({
  "src/lib/extensions/languageRegistry.ts"() {
    "use strict";
    init_monaco();
    extMap = /* @__PURE__ */ new Map();
    nameMap = /* @__PURE__ */ new Map();
  }
});

// src/lib/languages.ts
function languageFromPath(path) {
  const contributed = lookupContributedLanguage(path);
  if (contributed) return contributed;
  const name = path.split("/").pop() || path;
  const lower = name.toLowerCase();
  const byName = NAME_LANG[lower];
  if (byName) return byName;
  const idx = name.lastIndexOf(".");
  if (idx >= 0) {
    const ext = name.slice(idx).toLowerCase();
    const l = EXT_LANG[ext];
    if (l) return l;
  }
  return "plaintext";
}
var EXT_LANG, NAME_LANG;
var init_languages = __esm({
  "src/lib/languages.ts"() {
    "use strict";
    init_languageRegistry();
    EXT_LANG = {
      ".js": "javascript",
      ".mjs": "javascript",
      ".cjs": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".mts": "typescript",
      ".cts": "typescript",
      ".tsx": "typescript",
      ".py": "python",
      ".go": "go",
      ".rs": "rust",
      ".java": "java",
      ".c": "c",
      ".h": "c",
      ".cpp": "cpp",
      ".hpp": "cpp",
      ".cc": "cpp",
      ".cs": "csharp",
      ".php": "php",
      ".rb": "ruby",
      ".swift": "swift",
      ".kt": "kotlin",
      ".kts": "kotlin",
      ".sh": "shell",
      ".bash": "shell",
      ".zsh": "shell",
      ".ps1": "powershell",
      ".bat": "bat",
      ".cmd": "bat",
      ".lua": "lua",
      ".pl": "perl",
      ".r": "r",
      ".dart": "dart",
      ".scala": "scala",
      ".ex": "elixir",
      ".exs": "elixir",
      ".erl": "erlang",
      ".hs": "haskell",
      ".html": "html",
      ".htm": "html",
      ".css": "css",
      ".scss": "scss",
      ".sass": "scss",
      ".less": "less",
      ".vue": "vue",
      ".svelte": "svelte",
      ".astro": "html",
      ".json": "json",
      ".jsonc": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".toml": "ini",
      ".ini": "ini",
      ".xml": "xml",
      ".svg": "xml",
      ".sql": "sql",
      ".md": "markdown",
      ".markdown": "markdown",
      ".txt": "plaintext",
      ".csv": "plaintext",
      ".dockerfile": "dockerfile",
      "Dockerfile": "dockerfile",
      ".gitignore": "plaintext",
      ".env": "plaintext",
      ".gradle": "groovy",
      ".proto": "protobuf"
    };
    NAME_LANG = {
      "dockerfile": "dockerfile",
      "makefile": "makefile",
      "cmakelists.txt": "cmake",
      "package.json": "json",
      "tsconfig.json": "json",
      "vite.config.ts": "typescript",
      ".gitignore": "plaintext",
      ".env": "plaintext"
    };
  }
});

// src/lib/ai.ts
var DEFAULT_AI_SETTINGS;
var init_ai = __esm({
  "src/lib/ai.ts"() {
    "use strict";
    DEFAULT_AI_SETTINGS = {
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "",
      model: "deepseek-chat",
      temperature: 0.3,
      maxTokens: 2048
    };
  }
});

// src/lib/fileIcons.ts
function isBinaryName(name) {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return false;
  return [".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz", ".pdf", ".exe", ".dll"].includes(name.slice(idx).toLowerCase());
}
var SPECS, BY_EXT, BY_NAME;
var init_fileIcons = __esm({
  "src/lib/fileIcons.ts"() {
    "use strict";
    SPECS = {
      // Source
      ".js": { name: "Js", color: "#e8d44d" },
      ".jsx": { name: "React", color: "#61dafb" },
      ".ts": { name: "Ts", color: "#3178c6" },
      ".tsx": { name: "React", color: "#3178c6" },
      ".py": { name: "Py", color: "#ffd845" },
      ".go": { name: "Go", color: "#00add8" },
      ".rs": { name: "Rs", color: "#dea584" },
      ".java": { name: "Java", color: "#e76f00" },
      ".c": { name: "C", color: "#a8b7c6" },
      ".h": { name: "C", color: "#a8b7c6" },
      ".cpp": { name: "C++", color: "#f34b7d" },
      ".cs": { name: "C#", color: "#5c2d91" },
      ".php": { name: "Php", color: "#777bb4" },
      ".rb": { name: "Rb", color: "#cc342d" },
      ".swift": { name: "Swift", color: "#f05138" },
      ".kt": { name: "Kotlin", color: "#a97bff" },
      ".sh": { name: "Sh", color: "#89e051" },
      ".ps1": { name: "Ps", color: "#012456" },
      ".lua": { name: "Lua", color: "#000080" },
      ".pl": { name: "Pl", color: "#0298c3" },
      ".r": { name: "R", color: "#198ce7" },
      ".dart": { name: "Dart", color: "#0175c2" },
      ".scala": { name: "Scala", color: "#c22d40" },
      ".groovy": { name: "Groovy", color: "#4298b8" },
      ".ex": { name: "Elixir", color: "#6e4a7e" },
      ".erl": { name: "Erlang", color: "#b83998" },
      ".hs": { name: "Hs", color: "#5e5186" },
      ".clj": { name: "Clojure", color: "#63b132" },
      // Web
      ".html": { name: "Html", color: "#e44d26" },
      ".htm": { name: "Html", color: "#e44d26" },
      ".css": { name: "Css", color: "#42a5f5" },
      ".scss": { name: "Scss", color: "#cd6799" },
      ".sass": { name: "Sass", color: "#cd6799" },
      ".less": { name: "Less", color: "#1d365d" },
      ".vue": { name: "Vue", color: "#42b883" },
      ".svelte": { name: "Svelte", color: "#ff3e00" },
      ".astro": { name: "Astro", color: "#ff5d01" },
      // Data / config
      ".json": { name: "{}", color: "#cbcb41" },
      ".jsonc": { name: "{}", color: "#cbcb41" },
      ".yaml": { name: "Yaml", color: "#cb171e" },
      ".yml": { name: "Yaml", color: "#cb171e" },
      ".toml": { name: "Toml", color: "#9c4221" },
      ".xml": { name: "Xml", color: "#e37933" },
      ".sql": { name: "Sql", color: "#e38c00" },
      ".md": { name: "Md", color: "#519aba" },
      ".txt": { name: "Txt", color: "#9d9d9d" },
      ".csv": { name: "Csv", color: "#217346" },
      // Config files by name
      "package.json": { name: "npm", color: "#cb3837" },
      "package-lock.json": { name: "lock", color: "#cb3837" },
      "tsconfig.json": { name: "tsc", color: "#3178c6" },
      "vite.config.ts": { name: "vite", color: "#646cff" },
      "README.md": { name: "Rd", color: "#519aba" },
      "Dockerfile": { name: "Docker", color: "#2496ed" },
      ".gitignore": { name: "Git", color: "#f05033" },
      ".env": { name: "Env", color: "#fca121" },
      // Images
      ".png": { name: "img", color: "#9664f8" },
      ".jpg": { name: "img", color: "#9664f8" },
      ".jpeg": { name: "img", color: "#9664f8" },
      ".svg": { name: "svg", color: "#ff9800" },
      ".gif": { name: "img", color: "#9664f8" },
      ".ico": { name: "img", color: "#9664f8" },
      ".woff": { name: "font", color: "#0aa0b4" },
      ".ttf": { name: "font", color: "#0aa0b4" },
      // Generic
      "": { name: "File", color: "#9d9d9d" }
    };
    BY_EXT = /* @__PURE__ */ new Map();
    BY_NAME = /* @__PURE__ */ new Map();
    for (const [key, spec] of Object.entries(SPECS)) {
      if (key.startsWith(".")) BY_EXT.set(key, spec);
      else BY_NAME.set(key.toLowerCase(), spec);
    }
  }
});

// src/store/editorStore.ts
var editorStore_exports = {};
__export(editorStore_exports, {
  getActiveTab: () => getActiveTab,
  useEditorStore: () => useEditorStore
});
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...{
          fontSize: 14,
          tabSize: 4,
          lineHeight: 1.5,
          wordWrap: "off",
          minimap: true,
          lineNumbers: "on",
          formatOnSave: false,
          formatOnPaste: false,
          vimMode: false,
          autoSave: false,
          confirmBeforeClose: true,
          cursorBlinking: "smooth",
          cursorStyle: "line",
          fontLigatures: true,
          renderWhitespace: "selection",
          smoothScrolling: true,
          stickyScroll: true,
          bracketPairColorization: true,
          indentGuides: true,
          scrollBeyondLastLine: false,
          autoClosingBrackets: true,
          mouseWheelZoom: true,
          wordBasedSuggestions: true,
          parameterHints: true,
          folding: true,
          theme: "nova-dark",
          ai: DEFAULT_AI_SETTINGS
        },
        ...parsed,
        ai: { ...DEFAULT_AI_SETTINGS, ...parsed.ai }
      };
    }
  } catch {
  }
  return {
    fontSize: 14,
    tabSize: 4,
    lineHeight: 1.5,
    wordWrap: "off",
    minimap: true,
    lineNumbers: "on",
    formatOnSave: false,
    formatOnPaste: false,
    vimMode: false,
    autoSave: false,
    confirmBeforeClose: true,
    cursorBlinking: "smooth",
    cursorStyle: "line",
    fontLigatures: true,
    renderWhitespace: "selection",
    smoothScrolling: true,
    stickyScroll: true,
    bracketPairColorization: true,
    indentGuides: true,
    scrollBeyondLastLine: false,
    autoClosingBrackets: true,
    mouseWheelZoom: true,
    wordBasedSuggestions: true,
    parameterHints: true,
    folding: true,
    theme: "nova-dark",
    ai: DEFAULT_AI_SETTINGS
  };
}
function newGroup(activePath = null) {
  return { id: `g${groupCounter++}`, activePath };
}
function findNodeMutable(root, path) {
  if (root.path === path) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const found = findNodeMutable(c, path);
    if (found) return found;
  }
  return null;
}
function treeMap(root, fn) {
  const mapped = fn(root);
  const next = mapped === root ? { ...root } : mapped;
  if (next.children) {
    next.children = next.children.map((c) => treeMap(c, fn));
  }
  return next;
}
function updateTree(root, path, fn) {
  return treeMap(root, (n) => n.path === path ? fn(n) : n);
}
function insertChild(root, parentPath, child) {
  return treeMap(root, (n) => {
    if (n.path === parentPath) {
      const children = [...n.children || [], child];
      children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return { ...n, children, loaded: true, expanded: true };
    }
    return n;
  });
}
function remapNodePath(node, oldPath) {
  const newPath = oldPath.replace(/[^/]+$/, node.name);
  return treeMap(node, (n) => {
    const suffix = n.path.startsWith(oldPath) ? n.path.slice(oldPath.length) : "";
    return { ...n, path: suffix ? `${newPath}${suffix}` : newPath };
  });
}
function cloneNode(node) {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNode) : void 0
  };
}
function getActiveTab(s) {
  return s.openTabs.find((t) => t.path === s.activePath);
}
async function ensurePathLoaded(root, path) {
  const parts = path.split("/").slice(0, -1);
  let tree = root;
  let curPath = root.path;
  for (const segment of parts) {
    if (segment === root.name) continue;
    const nextPath = curPath ? `${curPath}/${segment}` : segment;
    if (findNodeMutable(tree, nextPath)) {
      curPath = nextPath;
      continue;
    }
    const parent = findNodeMutable(tree, curPath);
    if (!parent || parent.kind !== "directory") return;
    let children = parent.children;
    if (!parent.loaded || !children) {
      try {
        children = await listChildren(parent);
      } catch {
        return;
      }
      tree = updateTree(tree, curPath, (n) => ({ ...n, children: children || [], loaded: true }));
    }
    const child = (children || []).find((c) => c.name === segment);
    if (!child) return;
    curPath = nextPath;
  }
  useEditorStore.setState({ root: tree });
}
var SETTINGS_KEY, groupCounter, statusTimer, useEditorStore;
var init_editorStore = __esm({
  "src/store/editorStore.ts"() {
    "use strict";
    init_zustand();
    init_fileSystem();
    init_languages();
    init_ai();
    init_fileIcons();
    init_fileSystem();
    SETTINGS_KEY = "nova.settings.v1";
    groupCounter = 1;
    useEditorStore = create((set, get) => {
      const syncActive = (groups, activeGroupId) => {
        const g = groups.find((x) => x.id === activeGroupId);
        return g ? g.activePath : null;
      };
      return {
        root: null,
        demoMode: false,
        busy: false,
        openTabs: [],
        groups: [newGroup(null)],
        activeGroupId: "g1",
        activePath: null,
        sidebarView: "explorer",
        sidebarVisible: true,
        palette: { open: false, mode: "command", query: "" },
        cursor: { lineNumber: 1, column: 1 },
        settings: loadSettings(),
        statusMessage: null,
        bottomView: null,
        bottomHeight: 190,
        zenMode: false,
        patch: (partial) => set(partial),
        openWorkspace: async () => {
          try {
            set({ busy: true });
            const { root, demo } = await openWorkspace();
            set({ root, demoMode: demo, busy: false, sidebarVisible: true, sidebarView: "explorer" });
            void get().expandNode(root);
            get().setStatus(demo ? "Espacio de demostraci\xF3n abierto" : "Carpeta abierta", 2500);
          } catch (e) {
            set({ busy: false });
            if (e.name !== "AbortError") {
              get().setStatus(`No se pudo abrir la carpeta: ${e.message}`, 4e3);
            }
          }
        },
        openWorkspaceAt: async (absPath) => {
          try {
            set({ busy: true });
            const { root, demo } = await openWorkspaceAt(absPath);
            set({ root, demoMode: demo, busy: false, sidebarVisible: true, sidebarView: "explorer" });
            void get().expandNode(root);
            get().setStatus("Carpeta abierta", 2500);
          } catch (e) {
            set({ busy: false });
            if (e.name !== "AbortError") {
              get().setStatus(`No se pudo abrir la carpeta: ${e.message}`, 4e3);
            }
          }
        },
        loadDemoWorkspace: async () => {
          setBackend("virtual");
          const root = createDemoRoot();
          set({ root, demoMode: true, busy: false, sidebarVisible: true, sidebarView: "explorer" });
          void get().expandNode(root);
          get().setStatus("Espacio de demostraci\xF3n cargado", 2e3);
        },
        setSidebarView: (v) => set({ sidebarView: v, sidebarVisible: true }),
        toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
        setSidebarVisible: (v) => set({ sidebarVisible: v }),
        expandNode: async (node) => {
          const root = get().root;
          if (!root) return;
          let children = node.children;
          if (!node.loaded || !node.children) {
            try {
              children = await listChildren(node);
            } catch (e) {
              get().setStatus(`No se pudo leer la carpeta: ${e.message}`, 3e3);
              return;
            }
          }
          set({
            root: updateTree(root, node.path, (n) => ({
              ...n,
              children: children || [],
              loaded: true,
              expanded: true
            }))
          });
        },
        collapseNode: (node) => {
          const root = get().root;
          if (!root) return;
          set({
            root: updateTree(root, node.path, (n) => ({ ...n, expanded: false }))
          });
        },
        openFile: async (node, groupId) => {
          if (node.kind !== "file") return;
          if (isBinaryName(node.name)) {
            get().setStatus("No se puede abrir un archivo binario", 2500);
            return;
          }
          const existing = get().openTabs.find((t) => t.path === node.path);
          if (existing) {
            get().setActiveTab(node.path);
            return;
          }
          try {
            const content = await readText(node.handle);
            const tab = {
              path: node.path,
              name: node.name,
              language: languageFromPath(node.path),
              content,
              savedContent: content,
              dirty: false
            };
            set((s) => {
              const gid = groupId || s.activeGroupId;
              const groups = s.groups.map((g) => g.id === gid ? { ...g, activePath: node.path } : g);
              return {
                openTabs: [...s.openTabs, tab],
                groups,
                activeGroupId: gid,
                activePath: syncActive(groups, gid)
              };
            });
          } catch (e) {
            get().setStatus(`Error al abrir: ${e.message}`, 3e3);
          }
        },
        openFileByPath: async (path, groupId) => {
          const root = get().root;
          if (!root) return;
          const node = findNodeMutable(root, path);
          if (node) {
            await get().openFile(node, groupId);
            return;
          }
          await ensurePathLoaded(root, path);
          const retry = findNodeMutable(get().root, path);
          if (retry) await get().openFile(retry, groupId);
          else get().setStatus(`No se encontr\xF3 ${path}`, 2500);
        },
        closeTab: async (path, force) => {
          const { openTabs, activePath, settings } = get();
          const tab = openTabs.find((t) => t.path === path);
          if (!tab) return;
          if (tab.dirty && !force) {
            if (settings.confirmBeforeClose) {
              const keep = window.confirm(`El archivo "${tab.name}" tiene cambios sin guardar.

\xBFGuardar los cambios?`);
              if (keep) {
                await get().saveTab(path);
              } else {
                return;
              }
            } else {
              await get().saveTab(path);
            }
          }
          const remaining = openTabs.filter((t) => t.path !== path);
          let nextActive = activePath;
          if (activePath === path) {
            const idx = openTabs.findIndex((t) => t.path === path);
            const neighbor = remaining[idx] || remaining[idx - 1] || null;
            nextActive = neighbor ? neighbor.path : null;
          }
          set((s) => {
            const groups = s.groups.map((g) => {
              if (g.activePath !== path) return g;
              const idx = openTabs.findIndex((t) => t.path === path);
              const neighbor = remaining[idx] || remaining[idx - 1] || null;
              return { ...g, activePath: neighbor ? neighbor.path : null };
            });
            return {
              openTabs: remaining,
              groups,
              activePath: nextActive
            };
          });
        },
        setActiveTab: (path) => set((s) => {
          const groups = s.groups.map((g) => g.id === s.activeGroupId ? { ...g, activePath: path } : g);
          return { groups, activePath: path };
        }),
        setActiveGroup: (id) => set((s) => ({
          activeGroupId: id,
          activePath: syncActive(s.groups, id)
        })),
        splitGroup: () => set((s) => {
          const active = s.groups.find((g) => g.id === s.activeGroupId);
          const newG = newGroup(active ? active.activePath : null);
          return {
            groups: [...s.groups, newG],
            activeGroupId: newG.id,
            activePath: newG.activePath
          };
        }),
        closeGroup: (id) => set((s) => {
          if (s.groups.length === 1) {
            return {
              groups: [{ ...s.groups[0], activePath: null }],
              activePath: null
            };
          }
          const idx = s.groups.findIndex((g) => g.id === id);
          const groups = s.groups.filter((g) => g.id !== id);
          const nextId = s.activeGroupId === id ? (groups[idx] || groups[idx - 1] || groups[0]).id : s.activeGroupId;
          return {
            groups,
            activeGroupId: nextId,
            activePath: syncActive(groups, nextId)
          };
        }),
        updateTabContent: (path, content) => set((s) => ({
          openTabs: s.openTabs.map(
            (t) => t.path === path ? { ...t, content, dirty: content !== t.savedContent } : t
          )
        })),
        saveTab: async (path) => {
          const target = path || get().activePath;
          if (!target) return;
          let tab = get().openTabs.find((t) => t.path === target);
          if (!tab) return;
          const root = get().root;
          const node = root ? findNodeMutable(root, target) : null;
          if (!node || !node.handle) {
            get().setStatus("No se pudo localizar el archivo en disco", 2500);
            return;
          }
          const editor = window.__novaEditor;
          if (editor && get().settings.formatOnSave) {
            try {
              const formatAction = editor.getAction?.("editor.action.formatDocument");
              if (formatAction?.run) await formatAction.run();
              await new Promise((r) => setTimeout(r, 30));
            } catch {
            }
            tab = get().openTabs.find((t) => t.path === target) || tab;
          }
          try {
            await writeText(node.handle, tab.content);
            set((s) => ({
              openTabs: s.openTabs.map(
                (t) => t.path === target ? { ...t, savedContent: tab.content, dirty: false } : t
              )
            }));
            get().setStatus(`Guardado: ${node.name}`, 1500);
          } catch (e) {
            get().setStatus(`Error al guardar: ${e.message}`, 3e3);
          }
        },
        saveAll: async () => {
          const dirtyTabs = get().openTabs.filter((t) => t.dirty);
          for (const t of dirtyTabs) {
            await get().saveTab(t.path);
          }
        },
        revertTab: async (path) => {
          const tab = get().openTabs.find((t) => t.path === path);
          if (!tab) return;
          const root = get().root;
          const node = root ? findNodeMutable(root, path) : null;
          if (!node?.handle) return;
          const content = await readText(node.handle);
          set((s) => ({
            openTabs: s.openTabs.map(
              (t) => t.path === path ? { ...t, content, savedContent: content, dirty: false } : t
            )
          }));
        },
        createFile: async (parentPath, name) => {
          const root = get().root;
          if (!root) return;
          const parent = findNodeMutable(root, parentPath);
          if (!parent || parent.kind !== "directory" || !parent.handle) return;
          try {
            const node = await createEntry(parent.handle, name, "file");
            node.path = parentPath ? `${parentPath}/${name}` : name;
            const withNew = insertChild(root, parentPath, node);
            set({ root: withNew });
            await get().openFile(findNodeMutable(withNew, node.path));
          } catch (e) {
            get().setStatus(e.message, 3e3);
          }
        },
        createFolder: async (parentPath, name) => {
          const root = get().root;
          if (!root) return;
          const parent = findNodeMutable(root, parentPath);
          if (!parent || parent.kind !== "directory" || !parent.handle) return;
          try {
            const node = await createEntry(parent.handle, name, "directory");
            node.path = parentPath ? `${parentPath}/${name}` : name;
            set({ root: insertChild(root, parentPath, node) });
          } catch (e) {
            get().setStatus(e.message, 3e3);
          }
        },
        renameNode: async (parentPath, node, newName) => {
          const root = get().root;
          if (!root) return;
          const parent = findNodeMutable(root, parentPath);
          if (!parent?.handle) return;
          const oldPath = node.path;
          try {
            await renameEntry(parent.handle, node.name, newName);
            const nodeCopy = cloneNode(node);
            nodeCopy.name = newName;
            const renamed = remapNodePath(nodeCopy, oldPath);
            const tree = updateTree(root, parentPath, (p) => ({
              ...p,
              children: (p.children || []).map((c) => c.path === oldPath ? renamed : c)
            }));
            set((s) => ({
              root: tree,
              openTabs: s.openTabs.map((t) => {
                if (t.path === oldPath) {
                  return { ...t, path: renamed.path, name: newName, language: languageFromPath(renamed.path) };
                }
                return t;
              }),
              groups: s.groups.map((g) => g.activePath === oldPath ? { ...g, activePath: renamed.path } : g),
              activePath: s.activePath === oldPath ? renamed.path : s.activePath
            }));
          } catch (e) {
            get().setStatus(e.message, 3e3);
          }
        },
        deleteNode: async (parentPath, node) => {
          const root = get().root;
          if (!root) return;
          const parent = findNodeMutable(root, parentPath);
          if (!parent?.handle) return;
          try {
            await deleteEntry(parent.handle, node.name);
            const tree = updateTree(root, parentPath, (p) => ({
              ...p,
              children: (p.children || []).filter((c) => c.path !== node.path)
            }));
            const tabs = get().openTabs.filter((t) => t.path !== node.path && !t.path.startsWith(node.path + "/"));
            set((s) => ({
              root: tree,
              openTabs: tabs,
              groups: s.groups.map(
                (g) => g.activePath === node.path || g.activePath?.startsWith(node.path + "/") ? { ...g, activePath: null } : g
              ),
              activePath: s.activePath === node.path || s.activePath?.startsWith(node.path + "/") ? null : s.activePath
            }));
            get().setStatus(`Eliminado: ${node.name}`, 2e3);
          } catch (e) {
            get().setStatus(e.message, 3e3);
          }
        },
        openPalette: (mode) => set((s) => ({ palette: { open: true, mode: mode || s.palette.mode, query: "" } })),
        closePalette: () => set((s) => ({ palette: { ...s.palette, open: false } })),
        setPaletteQuery: (q) => set((s) => ({ palette: { ...s.palette, query: q } })),
        setCursor: (pos) => set({ cursor: pos }),
        updateSettings: (patch) => set((s) => {
          const next = { ...s.settings, ...patch, ai: { ...s.settings.ai, ...patch.ai || {} } };
          try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
          } catch {
          }
          return { settings: next };
        }),
        setStatus: (msg, timeoutMs) => {
          if (statusTimer) clearTimeout(statusTimer);
          set({ statusMessage: msg });
          if (timeoutMs) {
            statusTimer = setTimeout(() => set({ statusMessage: null }), timeoutMs);
          }
        },
        applyAIBuffer: (path, buffer) => {
          set((s) => ({
            openTabs: s.openTabs.map(
              (t) => t.path === path ? { ...t, content: buffer, dirty: buffer !== t.savedContent } : t
            )
          }));
        },
        setBottomView: (v) => set({ bottomView: v }),
        setBottomHeight: (h) => set({ bottomHeight: Math.max(90, Math.min(500, h)) }),
        toggleZen: () => set((s) => ({ zenMode: !s.zenMode }))
      };
    });
  }
});

// src/lib/extensions/extFs.ts
var extFs_exports = {};
__export(extFs_exports, {
  Buffer: () => Buffer2,
  ExtFs: () => ExtFs,
  extFs: () => extFs,
  installBufferGlobal: () => installBufferGlobal
});
function enoent(p) {
  const err2 = new Error(`ENOENT: no such file or directory, open '${p}'`);
  err2.code = "ENOENT";
  return err2;
}
function installBufferGlobal() {
  ;
  globalThis.Buffer = Buffer2;
}
var ExtFs, extFs, Buffer2;
var init_extFs = __esm({
  "src/lib/extensions/extFs.ts"() {
    "use strict";
    init_editorStore();
    init_fileSystem();
    ExtFs = class {
      cache = /* @__PURE__ */ new Map();
      hydratedKey = "";
      hydrating = null;
      root() {
        const root = useEditorStore.getState().root;
        if (!root?.handle) return null;
        return { handle: root.handle, name: root.name };
      }
      key(p) {
        const k = p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
        return k === "." ? "" : k;
      }
      async loadTree() {
        const r = this.root();
        this.cache.clear();
        this.cache.set("", { type: "dir", size: 0, mtime: Date.now() });
        if (!r) return;
        const prefix = r.name ? r.name + "/" : "";
        const skipDirs = ["node_modules", ".git", "dist", "build", "coverage", ".next"];
        const pending = [];
        await walkFiles(r.handle, (path, _handle) => {
          let rel = this.key(path);
          if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
          const segs = rel.split("/");
          if (segs.slice(0, -1).some((s) => skipDirs.includes(s))) return;
          const i = rel.lastIndexOf("/");
          const name = i >= 0 ? rel.slice(i + 1) : rel;
          if (name === ".git") return;
          this.cache.set(rel, { type: "file", size: 0, mtime: 0 });
          pending.push(rel);
          let dir2 = i >= 0 ? rel.slice(0, i) : "";
          while (true) {
            if (dir2 && !this.cache.has(dir2)) this.cache.set(dir2, { type: "dir", size: 0, mtime: 0 });
            if (!dir2) break;
            const j = dir2.lastIndexOf("/");
            dir2 = j >= 0 ? dir2.slice(0, j) : "";
          }
        });
        if (pending.length <= 1500) {
          await Promise.all(
            pending.map(async (rel) => {
              try {
                const h = await resolvePath(r.handle, rel);
                if (h && h.kind === "file") {
                  const text = await readText(h);
                  this.cache.set(rel, { type: "file", content: text, size: text.length, mtime: Date.now() });
                }
              } catch {
              }
            })
          );
        }
      }
      /** Hidrata el espejo desde el workspace actual (una vez por raíz). */
      async hydrate() {
        const r = this.root();
        const key = r ? r.name : "__none__";
        if (this.hydratedKey === key) return;
        if (this.hydrating) return this.hydrating;
        this.hydrating = (async () => {
          try {
            await this.loadTree();
            this.hydratedKey = key;
          } finally {
            this.hydrating = null;
          }
        })();
        return this.hydrating;
      }
      entry(rel) {
        return this.cache.get(this.key(rel));
      }
      /** Marca la raíz como desactualizada (p. ej. al abrir otra carpeta). */
      invalidate() {
        this.hydratedKey = "";
      }
      // ---- consultas síncronas (sobre el espejo) ----
      existsSync(p) {
        return this.entry(p) !== void 0;
      }
      isFileSync(p) {
        return this.entry(p)?.type === "file";
      }
      isDirSync(p) {
        return this.entry(p)?.type === "dir";
      }
      readFileSync(p, enc2) {
        const e = this.entry(p);
        if (!e) throw enoent(p);
        if (e.type !== "file") throw new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
        const text = e.content ?? "";
        if (enc2 === "utf8" || enc2 === "utf-8") return text;
        const bytes = new TextEncoder().encode(text);
        return enc2 ? Buffer2.from(bytes).toString(enc2) : bytes;
      }
      readdirSync(p) {
        const base = this.key(p);
        const prefix = base ? base + "/" : "";
        const set = /* @__PURE__ */ new Set();
        for (const k of this.cache.keys()) {
          if (!k.startsWith(prefix) || k === base) continue;
          const rest = k.slice(prefix.length);
          const name = rest.split("/")[0];
          if (name) set.add(name);
        }
        if (set.size === 0 && !this.cache.has(base)) throw enoent(p);
        return [...set].sort((a, b) => a.localeCompare(b));
      }
      statSync(p) {
        const e = this.entry(p);
        if (!e) throw enoent(p);
        const isDir = e.type === "dir";
        return {
          isFile: () => !isDir,
          isDirectory: () => isDir,
          isSymbolicLink: () => false,
          size: isDir ? 0 : e.size,
          mtimeMs: e.mtime,
          ctimeMs: e.mtime,
          birthtimeMs: e.mtime,
          mode: isDir ? 16895 : 33206
        };
      }
      // ---- operaciones síncronas de escritura (espejo inmediato + persistencia) ----
      writeFileSync(p, data) {
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        const rel = this.key(p);
        const i = rel.lastIndexOf("/");
        const parent = i >= 0 ? rel.slice(0, i) : "";
        if (parent && !this.cache.has(parent)) throw enoent(parent);
        this.cache.set(rel, { type: "file", content: text, size: text.length, mtime: Date.now() });
        void this.persistWrite(rel, text);
      }
      mkdirSync(p) {
        const rel = this.key(p);
        if (this.cache.has(rel)) throw new Error(`EEXIST: file already exists, mkdir '${p}'`);
        this.cache.set(rel, { type: "dir", size: 0, mtime: Date.now() });
        const r = this.root();
        if (r) void createDirAt(r.handle, rel).catch(() => {
        });
      }
      rmSync(p) {
        const rel = this.key(p);
        if (!this.cache.has(rel)) throw enoent(p);
        const prefix = rel ? rel + "/" : "";
        for (const k of [...this.cache.keys()]) {
          if (k === rel || k.startsWith(prefix)) this.cache.delete(k);
        }
        const r = this.root();
        if (r) void removeAt(r.handle, rel).catch(() => {
        });
      }
      renameSync(from, to) {
        const relFrom = this.key(from);
        const relTo = this.key(to);
        const e = this.cache.get(relFrom);
        if (!e) throw enoent(from);
        if (e.type === "dir") {
          const prefix = relFrom + "/";
          const toMove = [...this.cache.keys()].filter((k) => k.startsWith(prefix));
          for (const k of toMove) {
            this.cache.set(relTo + "/" + k.slice(prefix.length), this.cache.get(k));
            this.cache.delete(k);
          }
          this.cache.set(relTo, e);
          this.cache.delete(relFrom);
        } else {
          this.cache.set(relTo, e);
          this.cache.delete(relFrom);
        }
        const r = this.root();
        if (r) {
          void createFileAt(r.handle, relTo, e.type === "file" ? e.content ?? "" : "").catch(() => {
          });
          void removeAt(r.handle, relFrom).catch(() => {
          });
        }
      }
      async persistWrite(rel, text) {
        const r = this.root();
        if (!r) return;
        try {
          await writeFileAt(r.handle, rel, text);
        } catch {
        }
      }
      // ---- operaciones asíncronas (backend real) ----
      async readFile(p, enc2) {
        const r = this.root();
        if (!r) throw enoent(p);
        const handle = await resolvePath(r.handle, this.key(p));
        if (!handle || handle.kind !== "file") throw enoent(p);
        const text = await readText(handle);
        const rel = this.key(p);
        this.cache.set(rel, { type: "file", content: text, size: text.length, mtime: Date.now() });
        if (enc2 === "utf8" || enc2 === "utf-8") return text;
        const bytes = new TextEncoder().encode(text);
        return enc2 ? Buffer2.from(bytes).toString(enc2) : bytes;
      }
      async writeFile(p, data) {
        const r = this.root();
        if (!r) throw enoent(p);
        const text = typeof data === "string" ? data : new TextDecoder().decode(data);
        const rel = this.key(p);
        const parent = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
        if (!this.cache.has(parent)) throw enoent(parent);
        const ok = await writeFileAt(r.handle, rel, text);
        if (!ok) throw enoent(p);
        this.cache.set(rel, { type: "file", content: text, size: text.length, mtime: Date.now() });
      }
      async mkdir(p) {
        const r = this.root();
        if (!r) throw enoent(p);
        const rel = this.key(p);
        if (this.cache.has(rel)) throw new Error(`EEXIST: file already exists, mkdir '${p}'`);
        await createDirAt(r.handle, rel);
        this.cache.set(rel, { type: "dir", size: 0, mtime: Date.now() });
      }
      async rm(p) {
        const r = this.root();
        if (!r) throw enoent(p);
        const rel = this.key(p);
        const ok = await removeAt(r.handle, rel);
        if (!ok) throw enoent(p);
        const prefix = rel ? rel + "/" : "";
        for (const k of [...this.cache.keys()]) {
          if (k === rel || k.startsWith(prefix)) this.cache.delete(k);
        }
      }
      async rename(from, to) {
        const r = this.root();
        if (!r) throw enoent(from);
        const relFrom = this.key(from);
        const relTo = this.key(to);
        const e = this.cache.get(relFrom);
        if (!e) throw enoent(from);
        if (e.type === "dir") {
          const prefix = relFrom + "/";
          const toMove = [...this.cache.keys()].filter((k) => k.startsWith(prefix));
          for (const k of toMove) {
            this.cache.set(relTo + "/" + k.slice(prefix.length), this.cache.get(k));
            this.cache.delete(k);
          }
          this.cache.set(relTo, e);
          this.cache.delete(relFrom);
        } else {
          this.cache.set(relTo, e);
          this.cache.delete(relFrom);
        }
        await createFileAt(r.handle, relTo, e.type === "file" ? e.content ?? "" : "");
        await removeAt(r.handle, relFrom);
      }
      async watchDir(p, cb) {
        const rel = this.key(p);
        const handler = (e) => {
          const d = e.detail;
          if (!d) return;
          const fp = this.key(d.path);
          if (fp === rel || fp.startsWith(rel + "/")) cb(d.kind, fp);
        };
        window.addEventListener("nova:fs-change", handler);
        this.refreshEntry(rel).catch(() => {
        });
      }
      async refreshEntry(rel) {
        const r = this.root();
        if (!r) return;
        const handle = await resolvePath(r.handle, rel);
        if (!handle) return;
        if (handle.kind === "file") {
          const text = await readText(handle);
          this.cache.set(rel, { type: "file", content: text, size: text.length, mtime: Date.now() });
        } else {
          if (!this.cache.has(rel)) this.cache.set(rel, { type: "dir", size: 0, mtime: Date.now() });
        }
      }
    };
    extFs = new ExtFs();
    Buffer2 = class _Buffer {
      static from(input, enc2) {
        if (typeof input === "string") {
          return new _Buffer(new TextEncoder().encode(input));
        }
        return new _Buffer(input);
      }
      static alloc(size) {
        return new _Buffer(new Uint8Array(size));
      }
      static isBuffer(x) {
        return x instanceof _Buffer;
      }
      data;
      constructor(data) {
        this.data = data;
      }
      get length() {
        return this.data.length;
      }
      toString(enc2) {
        if (enc2 === "base64") {
          let bin = "";
          for (const b of this.data) bin += String.fromCharCode(b);
          return btoa(bin);
        }
        if (enc2 === "hex") {
          return [...this.data].map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        return new TextDecoder().decode(this.data);
      }
      write(str) {
        const bytes = new TextEncoder().encode(str);
        this.data.set(bytes);
        return bytes.length;
      }
      toJSON() {
        return { type: "Buffer", data: [...this.data] };
      }
    };
  }
});

// src/lib/extensions/nodeBuiltins.ts
var nodeBuiltins_exports = {};
__export(nodeBuiltins_exports, {
  getNodeBuiltins: () => getNodeBuiltins,
  makePathPolyfill: () => makePathPolyfill
});
function normalizeArray(parts, allowAboveRoot) {
  const res = [];
  for (let p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") {
      if (res.length && res[res.length - 1] !== "..") res.pop();
      else if (allowAboveRoot) res.push("..");
    } else {
      res.push(p);
    }
  }
  return res;
}
function win32(path) {
  return path.replace(/\//g, "\\");
}
function makePathPolyfill() {
  const p = {
    ...posix,
    win32: {
      sep: "\\",
      delimiter: ";",
      basename: (x) => win32Path(x).basename,
      dirname: (x) => win32Path(x).dirname,
      extname: (x) => win32Path(x).extname,
      join: (...a) => win32(posix.join(...a.map(win32))),
      resolve: (...a) => win32(posix.resolve(...a.map(win32))),
      normalize: (x) => win32(posix.normalize(win32(x))),
      isAbsolute: (x) => win32(x).startsWith("\\") || /^[A-Za-z]:\\/.test(x),
      relative: (f, t) => win32(posix.relative(win32(f), win32(t))),
      parse: (x) => {
        const pp = win32Path(x);
        return { root: pp.root, dir: pp.dirname, base: pp.basename, ext: pp.extname, name: pp.name };
      },
      format: (o) => win32(posix.format(o)),
      toNamespacedPath: (x) => x
    }
  };
  return p;
  function win32Path(x) {
    const w = win32(x);
    return {
      basename: posix.basename(w.replace(/\\/g, "/")),
      dirname: w.includes("\\") ? w.slice(0, w.lastIndexOf("\\")) : ".",
      extname: posix.extname(w.replace(/\\/g, "/")),
      name: (() => {
        const b = posix.basename(w.replace(/\\/g, "/"));
        const e = posix.extname(b);
        return e ? b.slice(0, -e.length) : b;
      })(),
      root: /^[A-Za-z]:\\/.test(w) ? w.slice(0, 3) : w.startsWith("\\") ? "\\" : ""
    };
  }
}
function sha256Bytes(msg) {
  let h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
  const K = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  const data = new TextEncoder().encode(msg);
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 8 >> 6) + 1) * 64);
  padded.set(data);
  padded[data.length] = 128;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  const rotr = (x, n) => x >>> n | x << 32 - n;
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(64);
    const v = new DataView(padded.buffer);
    for (let j = 0; j < 16; j++) w[j] = v.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ w[j - 15] >>> 3;
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ w[j - 2] >>> 10;
      w[j] = w[j - 16] + s0 + w[j - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch2 = e & f ^ ~e & g;
      const t1 = hh + S1 + ch2 + K[j] + w[j] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = S0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h = h.map((x, idx) => x + [a, b, c, d, e, f, g, hh][idx] >>> 0);
  }
  return new Uint8Array(h.flatMap((x) => [x >>> 24, x >>> 16 & 255, x >>> 8 & 255, x & 255]));
}
function bytesToBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function getNodeBuiltins() {
  return {
    path: pathPolyfill,
    "path/posix": pathPolyfill,
    "path/win32": pathPolyfill.win32,
    os: osPolyfill,
    util: utilPolyfill,
    events: { EventEmitter },
    crypto: cryptoPolyfill,
    url: urlPolyfill,
    assert: assertPolyfill,
    stream: streamPolyfill,
    zlib: zlibPolyfill,
    fs: fsPolyfill,
    "fs/promises": {
      readFile: fsPolyfill.readFile,
      writeFile: fsPolyfill.writeFile,
      readdir: fsPolyfill.readdir,
      mkdir: fsPolyfill.mkdir,
      rm: fsPolyfill.rm,
      unlink: fsPolyfill.unlink,
      stat: (p) => Promise.resolve(extFs.statSync(p)),
      access: (p) => extFs.existsSync(p) ? Promise.resolve() : Promise.reject(new Error("ENOENT")),
      rename: fsPolyfill.rename
    },
    process: processPolyfill,
    child_process: childProcessPolyfill,
    http: httpPolyfill,
    https: httpPolyfill,
    net: httpPolyfill,
    tls: {},
    buffer: { Buffer: Buffer2 },
    console,
    string_decoder: {
      StringDecoder: class {
        write(b) {
          return new TextDecoder().decode(b);
        }
        end() {
          return "";
        }
      }
    }
  };
}
var posix, pathPolyfill, basename, join, normalize, resolve, dirname, extname, EventEmitter, utilPolyfill, osPolyfill, cryptoPolyfill, Hash, urlPolyfill, assertPolyfill, streamPolyfill, zlibPolyfill, fsPolyfill, processPolyfill, childProcessPolyfill, httpPolyfill, ServerStub;
var init_nodeBuiltins = __esm({
  "src/lib/extensions/nodeBuiltins.ts"() {
    "use strict";
    init_extFs();
    init_esm();
    posix = {
      sep: "/",
      delimiter: ":",
      basename(p) {
        const clean = normalize(p);
        const i = clean.lastIndexOf("/");
        return i >= 0 ? clean.slice(i + 1) : clean;
      },
      dirname(p) {
        const clean = normalize(p);
        if (clean === "." || clean === "") return ".";
        const i = clean.lastIndexOf("/");
        if (i === -1) return ".";
        if (i === 0) return "/";
        return clean.slice(0, i);
      },
      extname(p) {
        const base = basename(p);
        const i = base.lastIndexOf(".");
        if (i <= 0) return "";
        return base.slice(i);
      },
      join(...parts) {
        return normalize(parts.join("/"));
      },
      resolve(...parts) {
        let resolved = "";
        let resolvedAbsolute = false;
        const all = parts.slice();
        for (let i = all.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          const p = i >= 0 ? all[i] : "";
          if (!p) continue;
          resolvedAbsolute = p.charAt(0) === "/";
          resolved = p.split("/").reverse().join("/");
        }
        if (!resolvedAbsolute) {
          const cwd = "/";
          resolved = cwd.split("/").reverse().join("/") + "/" + resolved;
        }
        resolved = normalize(resolved);
        if (resolved === "") return "/";
        return resolved;
      },
      normalize(p) {
        if (!p) return ".";
        const isAbsolute = p.charAt(0) === "/";
        const trailing = p.slice(-1) === "/";
        const parts = normalizeArray(p.split("/"), !isAbsolute);
        let out = parts.join("/");
        if (!out && !isAbsolute) out = ".";
        if (out && trailing) out += "/";
        if (isAbsolute) out = "/" + out;
        return out === "//" ? "/" : out;
      },
      isAbsolute(p) {
        return p.charAt(0) === "/";
      },
      relative(from, to) {
        const fromParts = normalizeArray(from.split("/"), false);
        const toParts = normalizeArray(to.split("/"), false);
        let i = 0;
        while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
        const up = fromParts.length - i;
        if (up === 0) return toParts.slice(i).join("/") || ".";
        return ".." + "/".repeat(up - 1) + (toParts.slice(i).length ? "/" + toParts.slice(i).join("/") : "");
      },
      parse(p) {
        const isAbsolute = p.charAt(0) === "/";
        const base = posix.basename(p);
        const ext = posix.extname(p);
        return {
          root: isAbsolute ? "/" : "",
          dir: isAbsolute ? p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "/" : posix.dirname(p),
          base,
          ext,
          name: ext ? base.slice(0, -ext.length) : base
        };
      },
      format(o) {
        const base = o.base ?? (o.name ?? "") + (o.ext ?? "");
        if (o.dir) return o.dir + "/" + base;
        return base;
      },
      toNamespacedPath: (p) => p,
      win32: {}
    };
    pathPolyfill = makePathPolyfill();
    ({ basename, join, normalize, resolve, dirname, extname } = posix);
    EventEmitter = class {
      listeners = /* @__PURE__ */ new Map();
      on = (ev, cb) => {
        const arr = this.listeners.get(ev) || [];
        arr.push(cb);
        this.listeners.set(ev, arr);
        return this;
      };
      once = (ev, cb) => {
        const wrapper = (...a) => {
          this.off(ev, wrapper);
          cb(...a);
        };
        this.on(ev, wrapper);
        return this;
      };
      off = (ev, cb) => {
        const arr = this.listeners.get(ev);
        if (arr) this.listeners.set(ev, arr.filter((f) => f !== cb));
        return this;
      };
      removeListener = this.off;
      emit = (ev, ...a) => {
        const arr = this.listeners.get(ev);
        if (!arr?.length) return false;
        for (const cb of arr.slice()) cb(...a);
        return true;
      };
      addListener = this.on;
      removeAllListeners = (ev) => {
        if (ev) this.listeners.delete(ev);
        else this.listeners.clear();
        return this;
      };
      getListeners = (ev) => this.listeners.get(ev) || [];
      listenerCount = (ev) => this.listeners.get(ev)?.length || 0;
      setMaxListeners = () => this;
    };
    utilPolyfill = {
      promisify(fn) {
        return (...args) => new Promise((resolve2, reject) => {
          fn(...args, (err2, ...rest) => {
            if (err2) reject(err2);
            else resolve2(rest.length > 1 ? rest : rest[0]);
          });
        });
      },
      inspect(o) {
        try {
          return JSON.stringify(o);
        } catch {
          return String(o);
        }
      },
      format(...a) {
        if (a.length === 0) return "";
        const fmt = a[0];
        if (typeof fmt !== "string") return a.join(" ");
        let i = 1;
        return fmt.replace(/%[sdifj%]/g, (m) => {
          if (m === "%%") return "%";
          const v = a[i++];
          if (m === "s") return String(v);
          if (m === "d" || m === "i") return String(Math.trunc(Number(v) || 0));
          if (m === "j") {
            try {
              return JSON.stringify(v);
            } catch {
              return String(v);
            }
          }
          return String(v);
        });
      },
      inherits(ctor, superCtor) {
        Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
        ctor.super_ = superCtor;
      },
      isString: (x) => typeof x === "string",
      isArray: Array.isArray,
      isObject: (x) => typeof x === "object" && x !== null,
      deprecate: (fn) => fn,
      types: {
        isString: (x) => typeof x === "string",
        isNumber: (x) => typeof x === "number",
        isBoolean: (x) => typeof x === "boolean",
        isArray: Array.isArray,
        isObject: (x) => typeof x === "object" && x !== null,
        isFunction: (x) => typeof x === "function"
      }
    };
    osPolyfill = {
      EOL: "\n",
      platform: "win32",
      release: () => "10.0.0",
      type: () => "Windows_NT",
      arch: () => "x64",
      homedir: () => "C:/Users/Usuario",
      tmpdir: () => "/tmp",
      cpus: () => [{ model: "Nova CPU", speed: 3e3, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }],
      totalmem: () => 16 * 1024 ** 3,
      freemem: () => 8 * 1024 ** 3,
      hostname: () => "nova",
      userInfo: () => ({ username: "nova", uid: 0, gid: 0, shell: null, homedir: "C:/Users/Usuario" }),
      networkInterfaces: () => ({}),
      endianness: () => "LE",
      loadavg: () => [0, 0, 0],
      uptime: () => 0,
      cwd: () => "/"
    };
    cryptoPolyfill = {
      randomBytes(size) {
        const out = new Uint8Array(size);
        if (typeof globalThis.crypto !== "undefined") globalThis.crypto.getRandomValues(out);
        return out;
      },
      randomUUID() {
        const c = globalThis.crypto;
        return typeof c?.randomUUID === "function" ? c.randomUUID() : "nova-" + Math.random().toString(16).slice(2);
      },
      createHash: () => new Hash(),
      getHashes: () => ["sha256", "sha1", "md5"],
      createHmac: () => new Hash()
    };
    Hash = class {
      buffer = "";
      update(data) {
        this.buffer += typeof data === "string" ? data : new TextDecoder().decode(data);
        return this;
      }
      digest(enc2) {
        const bytes = sha256Bytes(this.buffer);
        if (enc2 === "hex") return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (enc2 === "base64") return bytesToBase64(bytes);
        return bytes;
      }
    };
    urlPolyfill = {
      URL,
      URLSearchParams,
      fileURLToPath: (u) => String(u).replace(/^file:\/\/\//, "/").replace(/^file:\/\//, ""),
      pathToFileURL: (p) => "file:///" + p.replace(/\\/g, "/").replace(/^\//, ""),
      domainToASCII: (d) => d,
      domainToUnicode: (d) => d
    };
    assertPolyfill = {
      ok(v, msg) {
        if (!v) throw new Error(msg || "Assertion failed");
      },
      strictEqual(a, b, msg) {
        if (a !== b) throw new Error(msg || `Assertion failed: ${String(a)} !== ${String(b)}`);
      },
      notStrictEqual(a, b) {
        if (a === b) throw new Error(`Assertion failed: ${String(a)} === ${String(b)}`);
      },
      deepStrictEqual(a, b, msg) {
        if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || "Deep assertion failed");
      },
      fail(msg) {
        throw new Error(msg || "Assertion failed");
      }
    };
    streamPolyfill = {
      EventEmitter,
      PassThrough: class PassThrough extends EventEmitter {
        chunks = [];
        write(chunk) {
          this.chunks.push(chunk);
          this.emit("data", chunk);
          return true;
        }
        end() {
          this.emit("end");
        }
        pipe() {
        }
        pause() {
        }
        resume() {
        }
        read() {
          return this.chunks.shift();
        }
        setEncoding() {
        }
      },
      Readable: class Readable extends EventEmitter {
        push() {
        }
        pipe() {
        }
        pause() {
        }
        resume() {
        }
      },
      Writable: class Writable extends EventEmitter {
        write() {
          return true;
        }
        end() {
        }
      },
      Transform: class Transform extends EventEmitter {
        write() {
          return true;
        }
        end() {
        }
        pipe() {
        }
      },
      Duplex: class Duplex extends EventEmitter {
        write() {
          return true;
        }
        end() {
        }
        pipe() {
        }
      }
    };
    zlibPolyfill = {
      gzipSync: (d) => gzipSync(d instanceof Uint8Array ? d : strToU8(d)),
      gunzipSync: (d) => gunzipSync(d),
      inflateSync: (d) => inflateSync(d),
      deflateSync: (d) => deflateSync(d instanceof Uint8Array ? d : strToU8(d)),
      inflateRawSync: (d) => inflateSync(d),
      deflateRawSync: (d) => deflateSync(d instanceof Uint8Array ? d : strToU8(d)),
      constants: {}
    };
    fsPolyfill = {
      existsSync: (p) => extFs.existsSync(p),
      readFileSync: (p, enc2) => extFs.readFileSync(p, enc2),
      readdirSync: (p) => extFs.readdirSync(p),
      statSync: (p) => extFs.statSync(p),
      lstatSync: (p) => extFs.statSync(p),
      writeFileSync: (p, data) => {
        extFs.writeFileSync(p, data);
      },
      appendFileSync: (p, data) => {
        const existing = extFs.existsSync(p) ? String(extFs.readFileSync(p, "utf8")) : "";
        extFs.writeFileSync(p, existing + (typeof data === "string" ? data : new TextDecoder().decode(data)));
      },
      mkdirSync: (p) => {
        extFs.mkdirSync(p);
      },
      unlinkSync: (p) => {
        extFs.rmSync(p);
      },
      rmSync: (p) => {
        extFs.rmSync(p);
      },
      renameSync: (from, to) => {
        extFs.renameSync(from, to);
      },
      readFile: (p, ...rest) => {
        const cb = typeof rest[rest.length - 1] === "function" ? rest.pop() : null;
        const enc2 = typeof rest[0] === "string" ? rest[0] : void 0;
        const pr = extFs.readFile(p, enc2).then((d) => cb?.(null, d)).catch((e) => cb?.(e));
        return cb ? pr : extFs.readFile(p, enc2);
      },
      writeFile: (p, data, ...rest) => {
        const cb = typeof rest[rest.length - 1] === "function" ? rest.pop() : null;
        const pr = extFs.writeFile(p, data).then(() => cb?.(null)).catch((e) => cb?.(e));
        return cb ? pr : pr;
      },
      readdir: (p, ...rest) => {
        const cb = typeof rest[rest.length - 1] === "function" ? rest.pop() : null;
        const enc2 = typeof rest[0] === "string" ? rest[0] : void 0;
        const result = Promise.resolve(extFs.readdirSync(p));
        if (cb) result.then((d) => cb(null, d)).catch((e) => cb(e));
        return result;
      },
      mkdir: (p, ...rest) => {
        const cb = typeof rest[rest.length - 1] === "function" ? rest.pop() : null;
        const pr = extFs.mkdir(p).then(() => cb?.(null)).catch((e) => cb?.(e));
        return cb ? pr : pr;
      },
      rm: (p, opts, cb) => {
        if (typeof opts === "function") cb = opts;
        const pr = extFs.rm(p).then(() => cb?.(null)).catch((e) => cb?.(e));
        return cb ? pr : pr;
      },
      unlink: (p, cb) => fsPolyfill.rm(p, cb),
      rename: (from, to, cb) => {
        const pr = extFs.rename(from, to).then(() => cb?.(null)).catch((e) => cb?.(e));
        return cb ? pr : pr;
      },
      watch: (p, opts, cb) => {
        const emitter = new EventEmitter();
        if (typeof opts === "function") cb = opts;
        const fn = (e) => {
          const d = e.detail;
          if (!d) return;
          const isParent = String(d.path).replace(/\\/g, "/").startsWith(String(p).replace(/\\/g, "/"));
          if (isParent) {
            const ev = d.kind === "created" ? "add" : d.kind === "deleted" ? "unlink" : "change";
            emitter.emit(ev, d.path);
            if (cb) cb(ev, d.path);
          }
        };
        window.addEventListener("nova:fs-change", fn);
        return {
          on: emitter.on.bind(emitter),
          close: () => window.removeEventListener("nova:fs-change", fn),
          addListener: emitter.on.bind(emitter)
        };
      },
      promises: {}
    };
    processPolyfill = {
      env: {},
      platform: "win32",
      version: "v18.0.0",
      versions: { node: "18.0.0" },
      nextTick: (cb, ...args) => queueMicrotask(() => cb(...args)),
      cwd: () => "/",
      chdir: () => {
      },
      argv: [],
      exit: () => {
      },
      on: () => {
      },
      once: () => {
      },
      off: () => {
      },
      listeners: () => [],
      removeListener: () => {
      },
      title: "nova",
      pid: 1,
      uptime: () => 0,
      hrtime: (prev) => {
        const t = performance.now();
        const ns = Math.round(t * 1e6);
        return prev ? [0, Math.max(0, ns - prev[1])] : [0, ns];
      },
      memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
      stdout: {
        write: (s) => {
          console.log(String(s).replace(/\n$/, ""));
          return true;
        }
      },
      stderr: {
        write: (s) => {
          console.warn(String(s).replace(/\n$/, ""));
          return true;
        }
      },
      stdin: { on: () => {
      }, setEncoding: () => {
      }, pause: () => {
      }, resume: () => {
      } }
    };
    childProcessPolyfill = {
      execSync: () => {
        throw new Error("Nova: child_process no est\xE1 disponible en el navegador. Usa la app de escritorio.");
      },
      spawnSync: () => ({ status: 1, stdout: "", stderr: "child_process no disponible" }),
      exec: (_cmd, cb) => {
        if (cb) cb(new Error("child_process no disponible"), "", "");
      },
      spawn: () => ({ on: () => {
      }, stdout: { on: () => {
      }, pipe: () => {
      } }, stderr: { on: () => {
      }, pipe: () => {
      } }, stdin: { write: () => {
      } }, kill: () => {
      } })
    };
    httpPolyfill = {
      createServer: () => new ServerStub(),
      request: () => {
        throw new Error("Nova: http.request no est\xE1 soportado en el navegador");
      },
      get: () => {
        throw new Error("Nova: http.get no est\xE1 soportado en el navegador");
      }
    };
    ServerStub = class extends EventEmitter {
      listen = (port, cb) => {
        if (typeof port === "function") {
          cb = port;
          port = 0;
        }
        this.emit("listening");
        if (cb) cb();
        return this;
      };
      close = (cb) => {
        if (cb) cb();
        return this;
      };
      address = () => ({ address: "127.0.0.1", port: 0, family: "IPv4" });
    };
  }
});

// src/lib/extensions/loader.ts
var loader_exports = {};
__export(loader_exports, {
  CommonJsLoader: () => CommonJsLoader
});
function dirname2(p) {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : ".";
}
function join2(...parts) {
  const parts2 = parts.join("/");
  const out = [];
  for (const part of parts2.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}
var decoder, BUILTIN_KEYS, VIRTUAL_MODULES, CommonJsLoader;
var init_loader = __esm({
  "src/lib/extensions/loader.ts"() {
    "use strict";
    decoder = new TextDecoder();
    BUILTIN_KEYS = /* @__PURE__ */ new Set([
      "path",
      "path/posix",
      "path/win32",
      "os",
      "util",
      "events",
      "crypto",
      "url",
      "assert",
      "stream",
      "zlib",
      "fs",
      "fs/promises",
      "process",
      "child_process",
      "http",
      "https",
      "net",
      "tls",
      "buffer",
      "console",
      "string_decoder",
      "timers",
      "constants",
      "querystring"
    ]);
    VIRTUAL_MODULES = {
      "vsls/vscode": {
        getApi: () => Promise.resolve(void 0),
        getSharedService: () => Promise.resolve(void 0),
        sharedService: void 0,
        name: "vsls"
      }
    };
    CommonJsLoader = class {
      cache = /* @__PURE__ */ new Map();
      files;
      env;
      constructor(files, env) {
        this.files = files;
        this.env = env;
      }
      str(p) {
        const b = this.files[p];
        if (!b) return null;
        try {
          return decoder.decode(b);
        } catch {
          return null;
        }
      }
      has(p) {
        return p in this.files;
      }
      resolvePath(input) {
        const p = input.replace(/^\.\//, "");
        if (this.has(p) && !p.endsWith("/")) return p;
        for (const ext of [".js", ".cjs", ".json", ".mjs"]) {
          if (this.has(p + ext)) return p + ext;
        }
        if (this.has(p + "/index.js")) return p + "/index.js";
        if (this.has(p + "/index.cjs")) return p + "/index.cjs";
        if (this.has(p + "/package.json")) {
          const raw = this.str(p + "/package.json");
          if (raw) {
            try {
              const pkg = JSON.parse(raw);
              if (pkg.main) {
                const resolved = this.resolvePath(join2(p, pkg.main));
                if (resolved) return resolved;
              }
            } catch {
            }
          }
          return this.resolvePath(p + "/index");
        }
        return null;
      }
      resolve(spec, fromFile) {
        if (spec === "vscode") return "vscode";
        if (spec.startsWith("vscode-")) return "vscode";
        if (BUILTIN_KEYS.has(spec)) return `builtin:${spec}`;
        if (spec in VIRTUAL_MODULES) return `virtual:${spec}`;
        if (spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..") {
          return this.resolvePath(join2(dirname2(fromFile), spec));
        }
        const viaNm = this.resolvePath(join2(dirname2(fromFile), "node_modules", spec));
        if (viaNm) return viaNm;
        return null;
      }
      /** Devuelve el módulo para un archivo (compilando si hace falta). */
      load(resolved) {
        const cached = this.cache.get(resolved);
        if (cached) return cached;
        const moduleObj = { exports: {} };
        const localRequire = (spec) => {
          const r = this.resolve(spec, resolved);
          if (r === "vscode") return this.env.vscode;
          if (r?.startsWith("builtin:")) {
            const key = r.slice("builtin:".length);
            return this.env.builtins[key] ?? {};
          }
          if (r?.startsWith("virtual:")) {
            return VIRTUAL_MODULES[r.slice("virtual:".length)];
          }
          if (!r) {
            if (!spec.startsWith(".")) return void 0;
            throw new Error(
              `Nova: no se pudo resolver "${spec}" (desde ${resolved}). El m\xF3dulo no est\xE1 empaquetado en la extensi\xF3n.`
            );
          }
          return this.load(r).exports;
        };
        const code = this.str(resolved);
        if (code == null) throw new Error(`Nova: no existe ${resolved}`);
        if (resolved.endsWith(".json")) {
          moduleObj.exports = JSON.parse(code);
          this.cache.set(resolved, moduleObj);
          return moduleObj;
        }
        const self = this;
        const fn = new Function(
          "module",
          "exports",
          "require",
          "__filename",
          "__dirname",
          "process",
          "global",
          "Buffer",
          code
        );
        fn.call(
          moduleObj.exports,
          moduleObj,
          moduleObj.exports,
          localRequire,
          resolved,
          dirname2(resolved),
          this.env.process,
          this.env.globalThisRef,
          this.env.builtins.buffer.Buffer
        );
        this.cache.set(resolved, moduleObj);
        return moduleObj;
      }
      /** Carga la entrada principal de la extensión y devuelve su exports. */
      loadMain(mainPath) {
        const resolved = this.resolvePath(mainPath);
        if (!resolved) throw new Error(`Nova: no se encontr\xF3 el main "${mainPath}"`);
        return this.load(resolved).exports;
      }
    };
  }
});

// scripts/ext-test/entry.ts
globalThis.localStorage = /* @__PURE__ */ (() => {
  const m = /* @__PURE__ */ new Map();
  return {
    getItem: (k) => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    }
  };
})();
globalThis.window = { addEventListener() {
}, removeEventListener() {
}, dispatchEvent() {
  return true;
} };
globalThis.document = { head: { appendChild() {
} }, createElement() {
  return { setAttribute() {
  }, textContent: "" };
} };
var FIXTURE = {
  "extension/package.json": JSON.stringify(
    {
      name: "fixture-demo",
      publisher: "nova",
      version: "1.0.0",
      displayName: "Fixture Demo",
      description: "Extensi\xF3n de prueba del Extension Host de Nova",
      engines: { vscode: "^1.80.0" },
      main: "main.js",
      contributes: {
        commands: [{ command: "fixture.hello", title: "Fixture: Hola", category: "Fixture" }],
        languages: [{ id: "xlang", extensions: [".xlf"] }],
        menus: { "editor/context": [{ command: "fixture.hello", group: "1_modification" }] },
        configuration: {
          title: "Fixture",
          properties: { "fixture.port": { type: "number", default: 5500 } }
        }
      }
    },
    null,
    2
  ),
  "extension/main.js": `const vscode = require('vscode')
const path = require('path')
const fs = require('fs')
const helper = require('./helper')

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('fixture.hello', function () {
      vscode.window.showInformationMessage('Hola desde la extension de prueba')
      return helper.tag() + ':ok'
    }),
    vscode.commands.registerCommand('fixture.list', function () {
      return fs.readdirSync('.').join(',')
    }),
    vscode.commands.registerCommand('fixture.read', function (file) {
      const p = path.join('.', file)
      return fs.readFileSync(p, 'utf8')
    }),
    vscode.commands.registerCommand('fixture.write', function (file, content) {
      fs.writeFileSync(file, content)
      return fs.readFileSync(file, 'utf8')
    })
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
`,
  "extension/helper.js": `module.exports = { tag() { return 'HELPER' } }`
};
var enc = new TextEncoder();
async function main() {
  const { zipSync: zipSync2, strToU8: strToU82 } = await Promise.resolve().then(() => (init_esm(), esm_exports));
  const bytes = zipSync2({
    "extension/package.json": strToU82(FIXTURE["extension/package.json"]),
    "extension/main.js": strToU82(FIXTURE["extension/main.js"]),
    "extension/helper.js": strToU82(FIXTURE["extension/helper.js"])
  });
  let pass = 0;
  let fail = 0;
  const check = (name, ok, extra) => {
    if (ok) {
      pass++;
      console.log(`  [PASS] ${name}`);
    } else {
      fail++;
      console.log(`  [FAIL] ${name}${extra !== void 0 ? "  \u2192  " + String(extra) : ""}`);
    }
  };
  const { parseVsix: parseVsix2 } = await Promise.resolve().then(() => (init_vsixParser(), vsixParser_exports));
  let parsed;
  try {
    parsed = parseVsix2(bytes);
  } catch (e) {
    console.log("[FAIL] parseVsix lanz\xF3:", e.message);
    process.exit(1);
    return;
  }
  console.log("\n=== 1) VSIX extra\xEDdo (parseVsix) ===");
  check("id = nova.fixture-demo", parsed.id === "nova.fixture-demo", parsed.id);
  check("main = main.js", parsed.main === "main.js");
  check("el \xE1rbol de archivos incluye helper.js", "helper.js" in parsed.files);
  const cont = parsed.pkg.contributes;
  check("contributes.languages \u2192 .xlf", cont.languages[0].extensions[0] === ".xlf");
  check("contributes.menus \u2192 editor/context", cont.menus["editor/context"][0].command === "fixture.hello");
  check("contributes.configuration \u2192 fixture.port=5500", cont.configuration.properties["fixture.port"].default === 5500);
  const { useEditorStore: useEditorStore2 } = await Promise.resolve().then(() => (init_editorStore(), editorStore_exports));
  const { createDemoRoot: createDemoRoot2, setBackend: setBackend2 } = await Promise.resolve().then(() => (init_fileSystem(), fileSystem_exports));
  setBackend2("virtual");
  useEditorStore2.setState({ root: createDemoRoot2(), demoMode: true });
  const { getNodeBuiltins: getNodeBuiltins2 } = await Promise.resolve().then(() => (init_nodeBuiltins(), nodeBuiltins_exports));
  const { CommonJsLoader: CommonJsLoader2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
  const { extFs: extFs2 } = await Promise.resolve().then(() => (init_extFs(), extFs_exports));
  await extFs2.hydrate();
  console.log("  [debug] claves del espejo:", [...extFs2.cache?.keys() || []]);
  const registered = /* @__PURE__ */ new Map();
  const messages = [];
  const mockVscode = {
    Version: "1.0.0",
    commands: {
      registerCommand(id, h) {
        registered.set(id, h);
        return { dispose() {
        } };
      }
    },
    window: {
      showInformationMessage: (m) => {
        messages.push(m);
        return Promise.resolve(void 0);
      }
    },
    env: { appName: "Nova" },
    workspace: {
      workspaceFolders: [{ name: "demo-project", uri: { fsPath: "demo-project" } }],
      getConfiguration: () => ({ get: () => void 0, has: () => false })
    }
  };
  const builtins = getNodeBuiltins2();
  const loader = new CommonJsLoader2(parsed.files, {
    vscode: mockVscode,
    builtins,
    process: builtins.process,
    globalThisRef: globalThis
  });
  let exported;
  try {
    exported = loader.loadMain(parsed.main);
  } catch (e) {
    console.log("[FAIL] el main de la extensi\xF3n no carg\xF3:", e.message);
    process.exit(1);
    return;
  }
  console.log("\n=== 2) Extension Host (cargador CommonJS + activate) ===");
  const activate = typeof exported === "function" ? exported : exported?.activate;
  const context = { subscriptions: [] };
  if (typeof activate === "function") {
    try {
      const r = activate(context);
      if (r && typeof r.then === "function") await r;
      console.log("  [PASS] activate() se ejecut\xF3 sin errores");
    } catch (e) {
      console.log("[FAIL] activate() lanz\xF3:", e.message);
      process.exit(1);
      return;
    }
  } else {
    console.log("[FAIL] la extensi\xF3n no exporta activate()");
    process.exit(1);
    return;
  }
  check("registr\xF3 fixture.hello", registered.has("fixture.hello"));
  check("registr\xF3 fixture.list", registered.has("fixture.list"));
  check("registr\xF3 fixture.read", registered.has("fixture.read"));
  check("registr\xF3 fixture.write", registered.has("fixture.write"));
  console.log("\n=== 3) Comandos ejecutados con polyfills fs/path ===");
  const run = async (id, ...args) => {
    const h = registered.get(id);
    if (!h) return `NO-HANDLER:${id}`;
    const r = h(...args);
    return r && typeof r.then === "function" ? await r : r;
  };
  const list = await run("fixture.list");
  check("fixture.list \u2192 fs.readdirSync del workspace", typeof list === "string" && list.includes("package.json") && list.includes("src"), String(list).slice(0, 80));
  const pkg = await run("fixture.read", "package.json");
  let pkgName = "";
  try {
    pkgName = JSON.parse(String(pkg)).name;
  } catch {
  }
  check("fixture.read \u2192 fs.readFileSync + path.join", pkgName === "demo-project", String(pkg).slice(0, 60));
  const written = await run("fixture.write", "nuevo-archivo.txt", "Hola desde la extension");
  check("fixture.write \u2192 fs.writeFileSync + readFileSync", String(written).includes("Hola desde la extension"), String(written).slice(0, 40));
  const hello = await run("fixture.hello");
  check('fixture.hello \u2192 require("./helper.js") relativo + comando', hello === "HELPER:ok", hello);
  check("window.showInformationMessage se llam\xF3", messages.some((m) => m.includes("Hola desde la extension")), messages);
  const pathPoly = builtins.path;
  check('polyfill path.join("a","b") === "a/b"', pathPoly.join("a", "b") === "a/b", pathPoly.join("a", "b"));
  check('polyfill path.basename("/x/y.js") === "y.js"', pathPoly.basename("/x/y.js") === "y.js", pathPoly.basename("/x/y.js"));
  check('polyfill path.extname("a.ts") === ".ts"', pathPoly.extname("a.ts") === ".ts", pathPoly.extname("a.ts"));
  console.log(`
=== RESULTADO: ${pass} PASS, ${fail} FAIL ===`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error("Infraestructura de prueba fall\xF3:", e);
  process.exit(2);
});
