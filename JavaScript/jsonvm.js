function evalJson(json){
    return eval("(" + json + ")");
}

function RunEngine(){
    function log(str){
            var p = document.createElement("p");
            p.appendChild(document.createTextNode(str));
            document.getElementById("log").appendChild(p);
    };
    function checkParam(params,cnt){
    	if(params.length<cnt)return false;
    	for(var i=0;i<params.length;++i){
    		if(typeof(params[i])==="undefined")
    			return false;
    	}
    	return true;
    }

    var externs = {
            "<":function(n1,n2,c){
                log(n1 + " < "+n2+"? " + (n1<n2));
                callobj(c,n1<n2);
            },
            "1":1,
            "+":function(n1,n2,c){
                log(n1 + " + "+n2+" = " + (n1+n2));
                callobj(c,n1+n2);       
            },
            "-":function(n1,n2,c){
            	if(!checkParam(arguments,3))
            		return;
                log(n1 + " - "+n2+" = " + (n1-n2));
                callobj(c,n1-n2);
            },
            "*":function(n1,n2,c){
                log(n1 + " * "+n2+" = " + (n1*n2));
                callobj(c,n1*n2);       
            },
            "/":function(n1,n2,c){
                log(n1 + " / "+n2+" = " + (n1*n2));
                callobj(c,n1/n2);       
            }
        };

    var calls=[];
    var running = false;
    function runitem(item){
        calls.push(item);
        if(!running) running = true;
        else return;
        while(calls.length>0){
            calls.pop()();
        }
        running = false;
    }

    var callobj= function(obj){
        var args=[].slice.apply(arguments);
        args.shift();       
        do_callobj(obj,args);
    };
    function do_callobj(obj,args){
        if(typeof(obj)==="boolean") do_callobj(obj?args[0]:args[1]);
        if(typeof(obj)==="function") {
            runitem(function(){
                obj.apply(this,args);
            });
        };
    };

    this.getExtern = function(name){
        return externs[name];
    };
    this.callobj = callobj;
}

function JsonVM(code,engine){
    var entries = [];
    var waitting = {name:"waiting"};

    var getRefItem = function(refitem,ent,binds,args){
        if(refitem.type==="entry") return ent[refitem.index];
        else if(refitem.type==="bind") return binds[refitem.index];
        else if(refitem.type==="param") return args[refitem.index];
        else if(refitem.type==="extern") return engine.getExtern(refitem.name);
        else if(refitem.type==="waitting") return waitting;
    };
    var getBind = function(callspec,ent,binds,args){
        var objs = [];
        var mapping = [];
        var callee = getRefItem(callspec.callee,ent,binds,args);
        for(var i=0;i<callspec.params.length;++i){
            objs.push(getRefItem(callspec.params[i],ent,binds,args));
        }
        if(typeof(callee.params)!=="undefined"){
        	var currentidx = 0;
        	for(var i=0;i<callee.params.length;++i){
        		if(typeof(callee.params[i])==="undefined"){
        			mapping[currentidx++]=i;
        		}
        	}
        	mapping[currentidx]=i;
        }
        function f(){
        	var args = [].slice.apply(arguments);

        	for(var i=0;i<objs.length;++i){
    			if(args.length===0)break;
    			if(typeof(objs[i])==="undefined"){
    				if(args[0]!==waitting)objs[i]=args[0];
    				args.shift();
    			}
    		}

        	if(typeof(callee.params)!=="undefined"){
	    		objs = objs.concat(args);
	    		for(var i=0;i<objs.length;++i){
	    			if(objs[i]!==waitting){
	    				var j = mapping[i];
	    				if(j>0)
	    					callee.params[j] = objs[i];
	    			}
	    		}
	    		engine.callobj.apply(this, [callee]);
        	} else {
        		engine.callobj.apply(this, [callee].concat(objs));
        	}
        };
        f.params = objs;
        return f;
    };

    var getEntry = function(entry){
        function f(){     
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
        entries[code.exports[name]].apply(this,args);
    };
}

window.onload = function(){
    document.getElementById("run").onclick=function(){
        var code = evalJson(document.getElementById("code").value);
        var vm = new JsonVM(code,new RunEngine());
        vm.runExport("Parallel",20,10,function(n){ alert(n); });
    };
};