function evalJson(json) {
    return eval("(" + json + ")");
}

function RunEngine() {
    function log(str) {
        var p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        document.getElementById("log").appendChild(p);
    };
    function checkParam(params, cnt) {
        if (params.length < cnt) return false;
        for (var i = 0; i < params.length; ++i) {
            if (typeof (params[i]) === "undefined")
                return false;
        }
        return true;
    }

    var externs = {
        "<": function (n1, n2, c) {
            log(n1 + " < " + n2 + "? " + (n1 < n2));
            callobj(c, n1 < n2);
        },
        "1": 1,
        "+": function (n1, n2, c) {
            log(n1 + " + " + n2 + " = " + (n1 + n2));
            callobj(c, n1 + n2);
        },
        "-": function (n1, n2, c) {
            if (!checkParam(arguments, 3))
                return;
            log(n1 + " - " + n2 + " = " + (n1 - n2));
            callobj(c, n1 - n2);
        },
        "*": function (n1, n2, c) {
            log(n1 + " * " + n2 + " = " + (n1 * n2));
            callobj(c, n1 * n2);
        },
        "/": function (n1, n2, c) {
            log(n1 + " / " + n2 + " = " + (n1 * n2));
            callobj(c, n1 / n2);
        },
        "@": "@",
        "*": "*",
        "display": function (str, c) {
            log(str);
            callobj(c);
        }
    };

    var calls = [];
    var limit = -1;
    var running = false;
    function runitem(item) {
        if (limit > 0) limit--;
        else { if (limit == 0) return; }
        calls.push(item);
        if (!running) running = true;
        else return;
        while (calls.length > 0) {
            calls.pop()();
        }
        running = false;
    }

    var callobj = function (obj) {
        var args = [].slice.apply(arguments);
        args.shift();
        do_callobj(obj, args);
    };
    function do_callobj(obj, args) {
        if (typeof (obj) === "boolean") do_callobj(obj ? args[0] : args[1]);
        else if (typeof (obj) === "function") {
            runitem(function () {
                obj.apply(this, args);
            });
        } else if (Object.prototype.toString.call(obj) === "[object Array]") {
            log(obj);
            if (obj.length === 0) do_callobj(args[0], []);
            else {
                var ar = obj.slice();
                ar.shift();
                do_callobj(args[1], [obj[0], ar]);
            }
        }
    };

    this.getExtern = function (name) {
        return externs[name];
    };
    this.setLimit = function (lmt) {
        limit = lmt;
    }
    this.callobj = callobj;
}

function JsonVM(code, engine) {
    var entries = [];
    var waitting = { name: "waiting" };

    var getRefItem = function (refitem, ent, binds, args) {
        if (refitem.type === "entry") return ent[refitem.index];
        else if (refitem.type === "bind") return binds[refitem.index];
        else if (refitem.type === "param") return args[refitem.index];
        else if (refitem.type === "extern") return engine.getExtern(refitem.name);
        else if (refitem.type === "waitting") return waitting;
    };
    var getBind = function (callspec, ent, binds, args) {
        var objs = [];
        var mapping = [];
        var callee = getRefItem(callspec.callee, ent, binds, args);
        for (var i = 0; i < callspec.params.length; ++i) {
            objs.push(getRefItem(callspec.params[i], ent, binds, args));
        }
        if (typeof (callee) === "undefined") {
            console.log(callspec);
        }
        if (typeof (callee.setparams) !== "undefined") {
            var currentidx = 0;
            for (var i = 0; i < callee.params.length; ++i) {
                if (typeof (callee.params[i]) === "undefined") {
                    mapping[currentidx++] = i;
                }
            }
            mapping[currentidx] = i;
        }
        function f(args) {
            for (var i = 0; i < objs.length; ++i) {
                if (args.length === 0) break;
                if (typeof (objs[i]) === "undefined") {
                    if (args[0] !== waitting) objs[i] = args[0];
                    args.shift();
                }
            }
            if (typeof (callee.params) !== "undefined") {
                objs = objs.concat(args);
                for (var i = 0; i < objs.length; ++i) {
                    if (objs[i] !== waitting) {
                        var j = mapping[i];
                        if (j > 0)
                            callee.setparams(j, objs[i]);
                        //callee.params[j]=objs[i];
                    }
                }
                engine.callobj.apply(this, [callee]);
            } else {
                objs = objs.concat(args);
                engine.callobj.apply(this, [callee].concat(objs));
            }
        };
        function f_bind() { f([].slice.apply(arguments)); };
        f_bind.setparams = function (i, v) {
            objs[i] = v;
        };
        f_bind.params = objs;
        return f_bind;
    };

    var getEntry = function (entry) {
        function f_entry(args) {
            var binds = [];
            entry.binds.forEach(function (bind) {
                binds.push(getBind(bind, entries, binds, args));
            });
            entry.execs.forEach(function (exec) {
                getBind(exec, entries, binds, args)();
            });
        };
        return function () { f_entry([].slice.apply(arguments)); };
    };

    code.entries.forEach(function (entry) {
        entries.push(getEntry(entry));
    });

    this.runExport = function (name) {
        var args = [].slice.apply(arguments);
        args.shift();
        entries[code.exports[name]].apply(this, args);
    };
    this.hasExport = function (name) {
        return typeof (entries[code.exports[name]]) !== "undefined";
    };
}

function array_iter(engine, l) {
    var ar = [];
    function last() { alert(ar); }
    function next(first, rest) {
        ar.push(first);
        engine.callobj(rest, last, next);
    }
    engine.callobj(l, last, next);
}

window.onload = function () {
    document.getElementById("run").onclick = function () {
        var code = evalJson(document.getElementById("code").value);
        var engine = new RunEngine();
        var vm = new JsonVM(code, engine);
        if (vm.hasExport("Concurrent"))
            vm.runExport("Concurrent", 20, 10, function (n) { alert(n); });
        else if (vm.hasExport("Factorial"))
            vm.runExport("Factorial", 3, function (n) { alert(n); });
        else if (vm.hasExport("Concat"))
            vm.runExport("Concat", [1, 3, 4], [5, 6, 9], function (l) { array_iter(engine, l); });
        else if (vm.hasExport("Filter"))
            vm.runExport("Filter", [1, 5, 3, 2, 6, 9], function (i, whentrue, whenfalse) {
                if (i > 4) whentrue(); else whenfalse();
            }, function (l) { array_iter(engine, l); });
        else if (vm.hasExport("yinyang")) {
            engine.setLimit(10000);
            vm.runExport("yinyang");
        }
    };
};