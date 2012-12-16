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
        "&": "&",
        "display": function (str, c) {
            log(str);
            callobj(c);
        }
    };
    for (e in externs) {
        externs[e].f_name = e;
    }

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
    var waiting = { name: "waiting" };
    var ignore = { name: "ignore" };

    var getRefItem = function (refitem, binds, args) {
        if (refitem.type === "entry") return entries[refitem.index];
        else if (refitem.type === "bind") return binds[refitem.index];
        else if (refitem.type === "param") return args[refitem.index];
        else if (refitem.type === "extern") return engine.getExtern(refitem.name);
            // Special types:
            // "missing", or not given - 
            //          If this is for a bind object, the value can be filled later.
            //          However, the given value cannot be remembered, means different calls to the bind
            //          can provide different value for this reference item.
            // "waiting" -
            //          This value is not given, and later calls to the bind object can give a value.
            //          The first given value will be recorded as the actual value and later values will be
            //          ignored. This is useful for concurrents, which require a way to allow define an entry
            //          must been called after two cocurrent values being given.
            //
            //          If a bind object being called without all "waiting" values set, it simply refuse to continue.
            //          means do not actually call its "callee" part.
            // "ignore" -
            //          This is designed to work with "waiting". An "ignore" value of a bind object cannot be filled later.
            //          Usually, when the first bind object have 2 "waiting" positions, to create binds for callback,
            //          you may say I only allow the callback fill in the second position, without specify a value for the
            //          first one (you assume the first one will be or have been filled somewhere else). In this case you
            //          can use "ignore", to say current position do not have a value, but please assume it has a value.
        else if (refitem.type === "ignore") return ignore;
    };
    var getCallSpec = function (callspec, binds, args) {
        var waitings = [];
        var bond_values = [];
        var callee = getRefItem(callspec.callee, binds, args);
        for (var i = 0; i < callspec.params.length; ++i) {
            if (callspec.params[i].type === "waiting") {
                waitings.push(i);
                bond_values.push(waiting);
            }
            else {
                var refitem = getRefItem(callspec.params[i], binds, args);
                bond_values.push(refitem);
            }
        }
        var f_call = function () {
            var inargs = [].slice.apply(arguments);
            var outargs = bond_values.slice();
            for (var i = 0; i < outargs.length; ++i) {
                var iswaiting = waitings.indexOf(i) >= 0;
                if (outargs[i] === ignore) { delete outargs[i]; continue; };
                if (typeof (outargs[i]) !== "undefined" && !iswaiting) continue;
                if (outargs[i] === waiting) delete outargs[i];
                if (inargs.length !== 0) {
                    var v = inargs.shift();
                    if (bond_values[i] === waiting) bond_values[i] = v;
                    if (iswaiting) outargs[i] = bond_values[i];
                    else outargs[i] = v;
                }
            }
            var str = typeof (callee.f_name === "undefined") ? callee.toString() : callee.f_name;
            engine.callobj.apply(this, [callee].concat(outargs).concat(inargs));
        };
        f_call.waitings = waitings;
        f_call.bond_values = bond_values;
        return f_call;
    };

    var getEntry = function (entry) {
        var f_entry = function () {
            var args = [].slice.apply(arguments);
            var binds = [];
            entry.binds.forEach(function (bind) {
                var f_call = getCallSpec(bind, binds, args);
                f_call.f_name = entry.name + "#" + binds.length + "." + entry.count;
                binds.push(f_call);
            });
            entry.execs.forEach(function (exec) {
                getCallSpec(exec, binds, args)();
            });
            entry.count++;
        };
        return f_entry;
    };

    code.entries.forEach(function (entry) {
        var f_entry = getEntry(entry);
        entry.name =
        f_entry.f_name = "!" + entries.length;
        entry.count = 0;
        entries.push(f_entry);
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
            vm.runExport("Factorial", 4, function (n) { alert(n); });
        else if (vm.hasExport("Concat"))
            vm.runExport("Concat", [1, 3, 4], [5, 6, 9], function (l) { array_iter(engine, l); });
        else if (vm.hasExport("Filter"))
            vm.runExport("Filter", [1, 5, 3, 2, 6, 9], function (i, whentrue, whenfalse) {
                if (i > 4) whentrue(); else whenfalse();
            }, function (l) { array_iter(engine, l); });
        else if (vm.hasExport("yinyang")) {
            engine.setLimit(100);
            vm.runExport("yinyang");
        }
    };
};
