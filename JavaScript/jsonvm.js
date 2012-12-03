function evalJson(json){
    return eval("(" + json + ")");
}

function RunEngine(){
    var log = function(str){
            var p = document.createElement("p");
            p.appendChild(document.createTextNode(str));
            document.getElementById("log").appendChild(p);
    };

    var externs = {
            "<":function(n1,n2,c){
                log(n1 + " < "+n2+"? " + (n1<n2));
                c(n1<n2);
            },
            "1":1,
            "+":function(n1,n2,c){
            	console.log(arguments);
            	if(arguments.length<2) return;
                log(n1 + " + "+n2+" = " + (n1+n2));
                c(n1+n2);       
            },
            "-":function(n1,n2,c){
                log(n1 + " - "+n2+" = " + (n1-n2));
                c(n1-n2);
            },
            "*":function(n1,n2,c){
                log(n1 + " * "+n2+" = " + (n1*n2));
                c(n1*n2);       
            },
            "/":function(n1,n2,c){
                log(n1 + " / "+n2+" = " + (n1*n2));
                c(n1/n2);       
            }
        };

    var calls=[];
    var running = false;
    function runitem(item){
        calls.push(item);
        if(running) return;
        running = true;
        while(calls.length>0){
            calls.pop()();
        }
        running = false;
    }

    var do_callobj = function(obj,args){
        if(typeof(obj)==="boolean") do_callobj(obj?args[0]:args[1]);
        if(typeof(obj)==="function") {
            runitem(function(){
                obj.apply(this,args);
            });
        };
    };
    var bindobj = function(obj,args){
    	var params = args.slice();
        return function(){
        	
        	var argindex = 0;
        	for(var i=0;i<params.length;++i){
        		if(typeof(params[i])==="undefined")params[i]=arguments[argindex++];
        	}
            do_callobj(obj,params.concat([].slice.apply(arguments,argindex)));
        };
    };

    this.getExtern = function(name){
        return externs[name];
    };
    this.bindobj = bindobj;
}

function JsonVM(code,engine){
    var entries = [];

    var getRefItem = function(refitem,ent,binds,args){
        if(refitem.type==="entry") return ent[refitem.index];
        else if(refitem.type==="bind") return binds[refitem.index];
        else if(refitem.type==="param") return args[refitem.index];
        else if(refitem.type==="extern") return engine.getExtern(refitem.name);
    };
    var getBind = function(callspec,ent,binds,args){
        var objs = [];
        for(var i=0;i<callspec.params.length;++i){
            objs.push(getRefItem(callspec.params[i],ent,binds,args));
        }
        return engine.bindobj(getRefItem(callspec.callee,ent,binds,args),objs);
    };

    var getEntry = function(entry){
        var f = function(){
        	console.log(arguments.length + " " + getMaxArgIndexEntry(entry));
        	
        	if(arguments.length<entry.params)
        		return;
            var binds=[];
            var args = arguments;
            entry.binds.forEach(function(bind){
                binds.push(getBind(bind,entries,binds,args));
            });
            entry.execs.forEach(function(exec){
                getBind(exec,entries,binds,args)(); 
            });
        };
        return f;
    };

    code.entries.forEach(function(entry){
        entries.push(getEntry(entry));
    });

    this.runExport = function(name){
        var args=[].slice.apply(arguments);
        args.shift();
        engine.bindobj(entries[code.exports[name]],args)();
    };
}

window.onload = function(){
    document.getElementById("run").onclick=function(){
        var code = evalJson(document.getElementById("code").value);
        var vm = new JsonVM(code,new RunEngine());
        vm.runExport("Factorial",10,function(n){ alert(n); });
        //vm.runExport("Parallel",function(n){ alert(n); });
    };
};