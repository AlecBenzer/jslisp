var valid_start_id = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-*/_?!=<>'
var valid_in_id = valid_start_id + '0123456789'
var numeric = '0123456789.'
var space = ' \n\f\r\t\v'

function isspace(ch)
{
  return space.indexOf(ch) != -1;
}

function validInId(ch)
{
  return valid_in_id.indexOf(ch) != -1;
}

function validStartId(ch)
{
  return valid_start_id.indexOf(ch) != -1;
}

function validNumeric(ch)
{
  return numeric.indexOf(ch) != -1;
}

function Buffer(data)
{
  this.data = data;
  this.i = 0;
  this.lastChar = null;

  this.get = function()
  {
    if(this.i == this.data.length)
      return (this.lastChar = null);
    return (this.lastChar = this.data[this.i++]);
  }

  this.unget = function()
  {
    this.i -= 1;
  }

  this.empty = function()
  {
    return this.i == this.data.length;
  }
}


function Lexer(data)
{
  this.buffer = new Buffer(data);
  this.buffer.get();
  this.lastToken = null;

  this.getToken = function()
  {
    while(isspace(this.buffer.lastChar))
      this.buffer.get();

    var singles = '()\'';
    if(singles.indexOf(this.buffer.lastChar) != -1)
    {
      this.lastToken = this.buffer.lastChar;
      this.buffer.get();
      return this.lastToken;
    }
    if(this.buffer.lastChar == null)
      return null;
    if(validStartId(this.buffer.lastChar))
    {
      var iden = this.buffer.lastChar;
      while(validInId((this.buffer.get())))
        iden += this.buffer.lastChar;
      var result = new String(iden);
      result.lispType = "symbol";
      return (this.lastToken = result);
    }
    if(this.buffer.lastChar == '\"')
    {
      var str = "";
      while(this.buffer.get() != '\"')
        str += this.buffer.lastChar;
      var result = new String(str);
      result.lispType = "string";
      this.buffer.get();
      return (this.lastToken = result);
    }
    if(validNumeric(this.buffer.lastChar))
    {
      var num_str = this.buffer.lastChar;
      while(validNumeric((this.buffer.get())))
        num_str += this.buffer.lastChar;
      return (this.lastToken = parseFloat(num_str));
    }
    if(this.buffer.lastChar == '#')
    {
      var b = this.buffer.get();
      this.buffer.get();
      if(b == 't')
        return (this.lastToken = true);
      else if(b == 'f')
        return (this.lastToken = false);
      else
        throw "unexpected character \'" + b + "\' following #";
    }
    throw "unexpected character";
  }

  this.empty = function()
  {
    return this.buffer.empty();
  }
}

//more arg checking required for contract functions

function makeContract(args)
{
  var res = new Object();
  res.predList = args;
  res.vararg = false;
  return res;
}

function makeContractVararg(pred)
{
  var res = new Object();
  res.pred = pred;
  res.vararg = true;
  return res;
}

function attachContract(fn,contract)
{
  //alert("attachContract() with fn = " + stringRep(fn) + ", contract = " + stringRep(contract));
  
  if(isFunction(fn))
    fn.contract = contract;
  else
    throw "expected a function, got " + stringRep(fn);
  //alert("returning from attachContract()");
  return lispNull;
}

function runContract(fn,args)
{
  var contract = fn.contract;
  if(contract == undefined)
    return;
  if(contract.vararg)
  {
    var itr = args;
    var pred = contract.pred;
    while(!isNull(itr))
    {
      if(!pred(cons(itr.car,lispNull)))
      {
        if(pred.lispName)
          throw decodeName(fn.lispName) + ": contract predicate " + pred.lispName + " failed; given " + stringRep(itr.car);
        else
          throw decodeName(fn.lispName) + ": contract predicate failed; given " + stringRep(itr.car);
      }
      itr = itr.cdr;
    }
  }
  else
  {
    var itr = args;
    var itr2 = contract.predList;
    while(!isNull(itr) && !isNull(itr2))
    {
      var pred = itr2.car;
      if(!pred(cons(itr.car,lispNull)))
      {
        if(pred.lispName)
          throw decodeName(fn.lispName) + ": contract predicate " + pred.lispName + " failed; given " + stringRep(itr.car);
        else
          throw decodeName(fn.lispName) + ": contract predicate failed; given " + stringRep(itr.car);
      }
      itr = itr.cdr;
      itr2 = itr2.cdr;
    }
  }
}

var lispNull = new Object();

function isNull(obj)
{
  return obj == lispNull;
}

function add(args)
{
  var result = 0;
  var tmp = args;
  while(!isNull(tmp))
  {
    //alert(".car 9");
    //if(!isNumber(tmp.car))
    //  throw "+ expects all numbers";
    result += tmp.car;
    tmp = tmp.cdr;
  }
  return result;
}

function sub(args)
{
  var result;
  var tmp;
  if(listLength(args) <= 1)
  {
    result = 0;
    tmp = args;
  }
  else
  {
    result = args.car;
    tmp = args.cdr;
  }
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "- expects all numbers";
    result -= tmp.car;
    tmp = tmp.cdr;
  }
  return result;
}

function mul(args)
{
  var result = 1;
  var tmp = args;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "* expects all numbers";
    result *= tmp.car;
    tmp = tmp.cdr;
  }
  return result;
}

function div(args)
{
  var result;
  var tmp;
  if(listLength(args) <= 1)
  {
    result = 1;
    tmp = args;
  }
  else
  {
    result = args.car;
    tmp = args.cdr;
  }
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "/ expects all numbers";
    result /= tmp.car;
    tmp = tmp.cdr;
  }
  return result;
}

function symbol_equal(a,b)
{
  return a.toString() == b.toString();
}

function num_eq(args)
{
  if(listLength(args) <= 1)
    return true;
  var prev = args.car;
  if(!isNumber(prev))
    throw "= expects all numbers";
  var tmp = args.cdr;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "= expects all numbers";
    if(tmp.car != prev)
      return false;
    prev = tmp.car;
    tmp = tmp.cdr
  }
  return true;
}

function num_lt(args)
{
  if(listLength(args) <= 1)
    return true;
  var prev = args.car;
  if(!isNumber(prev))
    throw "= expects all numbers";
  var tmp = args.cdr;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "< expects all numbers";
    if(!(prev < tmp.car))
      return false;
    prev = tmp.car;
    tmp = tmp.cdr
  }
  return true;
}

function num_gt(args)
{
  if(listLength(args) <= 1)
    return true;
  var prev = args.car;
  if(!isNumber(prev))
    throw "= expects all numbers";
  var tmp = args.cdr;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "> expects all numbers";
    if(!(prev > tmp.car))
      return false;
    prev = tmp.car;
    tmp = tmp.cdr
  }
  return true;
}

function num_lte(args)
{
  if(listLength(args) <= 1)
    return true;
  var prev = args.car;
  if(!isNumber(prev))
    throw "= expects all numbers";
  var tmp = args.cdr;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw "<= expects all numbers";
    if(!(prev <= tmp.car))
      return false;
    prev = tmp.car;
    tmp = tmp.cdr
  }
  return true;
}

function num_gte(args)
{
  if(listLength(args) <= 1)
    return true;
  var prev = args.car;
  if(!isNumber(prev))
    throw "= expects all numbers";
  var tmp = args.cdr;
  while(!isNull(tmp))
  {
    if(!isNumber(tmp.car))
      throw ">= expects all numbers";
    if(!(prev >= tmp.car))
      return false;
    prev = tmp.car;
    tmp = tmp.cdr
  }
  return true;
}

function cons(car,cdr)
{
  obj = new Object();
  obj.car = car;
  obj.cdr = cdr;
  return obj;
}

function append(a,b)
{
  if(isNull(a))
    return b;
  var end = a;
  while(!isNull(end.cdr))
    end = end.cdr;
  end.cdr = b;
  return a;
}

//naive solution
function reverse(lst)
{
  var arr = listToArray(lst);
  arr.reverse();
  return arrayToList(arr);
}

function list(args)
{
  args.quoted = true;//neccesary?
  return args;
}

function car(lst)
{
  if(!isList(lst))
    throw "car expects a list";
  return lst.car;
}

function cdr(lst)
{
  if(!isList(lst))
    throw "cdr expects a list";
  var ret = lst.cdr;
  ret.quoted = lst.quoted;
  return ret;
}

function and(lst)
{
  var args = lst;
  while(!isNull(args))
  {
    if(!args.car)
      return false;
    args = args.cdr;
  }
  return true;
}

function or(lst)
{
  var args = lst;
  while(!isNull(args))
  {
    if(args.car)
      return true;
    args = args.cdr;
  }
  return false;
}

function arrayToList(arr)
{
  var cell = lispNull;
  for(i in arr.reverse())
  {
    cell = cons(arr[i],cell);
  }
  return cell;
}

function listToArray(lst)
{
  var arr = new Array();
  var tmp = lst;
  //alert(".car 12");
  while(!isNull(tmp))
  {
    arr.push(tmp.car);
    tmp = tmp.cdr;
  }
  return arr;
}

function listLength(lst)
{
  var len = 0;
  var tmp = lst;
  while(!isNull(tmp))
  {
    len += 1;
    tmp = tmp.cdr;
  }
  return len;
}

function isPair(obj)
{
  return obj.car != undefined && obj.cdr != undefined;
}

function isList(obj)
{
  return isNull(obj) || (isPair(obj) && isList(obj.cdr));
}

function isSymbol(obj)
{
  return obj.lispType == "symbol";
}

function isNumber(obj)
{
  return typeof obj == "number";
}

function isBool(obj)
{
  return typeof obj == "boolean";
}

function isFunction(obj)
{
  return typeof obj == "function";
}

function isContract(obj)
{
  return obj.vararg != undefined; //TODO bad way to check
}

function isString(obj)
{
  return obj.lispType == "string";
}

function concat(args)
{
  var itr = args;
  var str = new String("");
  while(!isNull(itr))
  {
    str = new String(str.toString() + itr.car);
    itr = itr.cdr;
  }
  str.lispType = "string";
  return str;
}

function symbolToString(sym)
{
  var str = sym;
  sym.lispType = "string";
  return str;
}

function createLispFunction(regFn,name)
{
  if(name == undefined)
    name = "function";
  return function(lst)
  {
    //alert("calling " + name);
    var airity = regFn.prototype.constructor.length;
    var given = listLength(lst);
    if(given != airity)
      throw name + " expects " + airity + " args; given " + given
    //lolz solution:
    //alert(".car 13");
    switch(airity)
    {
      case 0:
        return regFn();
      case 1:
        return regFn(lispEval(lst.car));
      case 2:
      {
        var result = regFn(lispEval(lst.car),lispEval(lst.cdr.car));
        return result;
      }
      case 3:
        return regFn(lispEval(lst.car),lispEval(lst.cdr.car),lispEval(lst.cdr.cdr.car));
      default:
        throw "not implemented: lispFunction created from a javascript function expecting more than 3 args";
    }
  }
}

function createLispFunctionVararg(regFn)
{
  return function(lst)
  {
    var evald = [];
    var itr = lst;
    while(!isNull(itr))
    {
      //alert(".car 1");
      evald.push(lispEval(itr.car));
      itr = itr.cdr;
    }
    return regFn(arrayToList(evald));
  }
}

function createUserFunction(prms,body)
{
  return function(lst)
  {
    var params = new Array();
    var names = prms;
    var vals = lst;
  
    var gotAirity = listLength(lst);
    var expectedAirity = listLength(prms);
    if(gotAirity != expectedAirity)
      throw "function expects " + expectedAirity + " args, got " + gotAirity;
    
    while(!isNull(names))
    {
      //alert(".car 2");
      params[names.car] = lispEval(vals.car);
      names = names.cdr;
      vals = vals.cdr;
    }
    symbol_table.push(params);

    var to_return = lispNull;
    var body_tmp = body;
    while(!isNull(body_tmp))
    {
      //alert(".car 3");
      var next_body = sanitize(body_tmp.car);
      next_body.shouldEval = true;
      to_return = lispEval(next_body);
      body_tmp = body_tmp.cdr;
    }
    symbol_table.pop();
    return to_return;
  };
}

function sanitize(body)
{
  if(isSymbol(body))
  {
    var res = symbolLookupNonGlobal(body);
    if(res == null)
    {
      return body;
    }
    else
    {
      return res;
    }
  }
  else if(isSelfEval(body))
  {
    return body;
  }
  else if(isList(body))
  {
    var newList = [];
    var itr = body;
    while(!isNull(itr))
    {
      //alert(".car 4");
      newList.push(sanitize(itr.car));
      itr = itr.cdr;
    }
    var result = arrayToList(newList);
    return result;
  }
}

function isSelfEval(obj)
{
  return isNumber(obj) || isBool(obj) || isString(obj) || isFunction(obj);//I guess functions are self-evaling?
}

function Parser(str)
{
  this.lexer = new Lexer(str);

  this.parse = function()
  {
    var tok = this.lexer.lastToken;
    if(tok == null)
      throw "Token was null";
    if(tok == '(')
    {
      var lst = new Array();
      while((tok = this.lexer.getToken()) != ')')
      {
        if(tok == null)
          throw "unexpected eof";
        lst.push(this.parse());
      }
      var ret =  arrayToList(lst);
      ret.shouldEval = true;
      return ret;
    }
    if(tok == '\'')
    {
      this.lexer.getToken();
      obj = this.parse();
      obj.quoted = true;
      obj.shouldEval = false;
      return obj;
    }
    if(tok == ')')
      throw "unexpected ')'";
    return tok; //numbers, symbols, strings, and closing parens are returned raw
  }

  //must be called before every extern call to parse()
  //TODO this is a sloppy solution
  this.prime = function()
  {
    this.lexer.getToken();
  }

  this.empty = function()
  {
    return this.lexer.empty();
  }
}

var globals = new Array();
var symbol_table = [globals];

function symbolLookup(n)
{
  var name = encodeName(n.toString());
  for(i = symbol_table.length-1;i >= 0;i--)
  {
    if(symbol_table[i][name] != undefined)
      return symbol_table[i][name];
  }
  throw "undefined symbol " + n;
}

function symbolLookupNonGlobal(n)
{
  var name = encodeName(n.toString());
  for(i = symbol_table.length-1;i >= 1;i--)
  {
    if(symbol_table[i][name] != undefined)
      return symbol_table[i][name];
  }
  return null;
}

globals["null"] = lispNull;

function encodeName(str)
{
  if(["length","map","filter","reduce","concat"].indexOf(str) >= 0)
    return "###" + str;
  else return str;
}

function decodeName(str)
{
  str = str.toString();
  if(str.indexOf("###") == 0)
    return str.substring(3);
  else return str;
}

function addPredefinedFunction(n,fn)
{
  var name = encodeName(n.toString());
  globals[name] = createLispFunction(fn,name);
  globals[name].lispName = n;
}

function addPredefinedFunctionVararg(n,fn)
{
  var name = encodeName(n.toString());
  globals[name] = createLispFunctionVararg(fn);
  globals[name].lispName = n;
}

function stringRep(obj)
{
  if(isNull(obj))
    return "()";
  if(isList(obj))
  {
    var str = "(";
    var tmp = obj;
    while(!isNull(tmp))
    {
      //alert(".car 5");
      str += stringRep(tmp.car) + (isNull(tmp.cdr) ? ")" : " ");
      tmp = tmp.cdr;
    }
    return str;
  }
  if(isPair(obj))
    return "(" + obj.car + " . " + obj.cdr + ")";
  if(isFunction(obj))
  {
    if(obj.lispName == undefined)
      return "<function>";
    else
      return "<function:" + decodeName(obj.lispName) + ">";
  }
  if(isBool(obj))
  {
    if(obj)
      return "#t";
    else
      return "#f";
  }
  if(isContract(obj))
  {
    return "<contract>";
  }
  if(isSymbol(obj))
  {
    return obj.toString();
  }
  if(isString(obj))
  {
    return '\"' + obj.toString() + '\"';
  }
  return obj;
}

function lispEval(expr)
{
  //leave it alone if its quoted
  if(expr.quoted)
    return expr;

  if(isSymbol(expr))
  {
    return symbolLookup(expr);
  }

  if(isList(expr))// && expr.shouldEval)
  {
    if(isNull(expr))
      throw "missing function";
    //alert(".car 6");
    var action = expr.car;
    if(action == "define")
    {
      if(expr.cdr.car == undefined || !isSymbol(expr.cdr.car))
        throw "define: bad syntax (requires symbol after 'define')";
      var name = encodeName(expr.cdr.car.toString());
      if(expr.cdr.cdr.car == undefined)
        throw "define: bad syntax (requires expression after identifier)";
      var val = lispEval(expr.cdr.cdr.car);
      globals[name] = val;
      if(isFunction(val) && val.lispName == undefined)
        globals[name].lispName = name;
      return val;
    }
    else if(action == "lambda")
    {
      if(expr.cdr.car == undefined || !isList(expr.cdr.car))
        throw "lambda: bad syntax (requires parameter list after 'lambda')";
      var parms = expr.cdr.car;
      if(isNull(expr.cdr.cdr))
        throw "lambda: bad syntax (expects one or more expressions after param list)";
      return createUserFunction(parms,expr.cdr.cdr);
    }
    else if(action == "if")
    {
      if(expr.cdr.car == undefined)
        throw "if: bad synax (requires condition after 'if')";
      var cond = expr.cdr.car;
      if(expr.cdr.cdr.car == undefined)
        throw "if: bad syntax (requires if-true expression after condition)";
      var if_true = expr.cdr.cdr.car;
      if(expr.cdr.cdr.cdr.car == undefined)
        throw "if: bad syntax (requires else expression after if-true expression)";
      var if_false = expr.cdr.cdr.cdr.car;
      if(lispEval(cond))
        return lispEval(if_true);
      else
        return lispEval(if_false);
    }
    else if(action == "quote")
    {
      if(isNull(expr.cdr))
        throw "quote: bad syntax (expects a form)";
      var cpy = expr.cdr.car;
      cpy.quoted = true;
      return cpy;
    }
    else if(action == "let")
    {
      var rest = expr.cdr;
      if(isNull(rest))
        throw "let: bad syntax (let requires a list of bindings)";
      var bindings = expr.cdr.car;
      if(!isList(bindings))
        throw "let: bad syntax (let requires a list of bindings)";

      var newTable = [];
      while(!isNull(bindings))
      {
        var binding = bindings.car;
        if(!isList(binding))
          throw "let: bad syntax (bindings must be lists)";
        var name = binding.car;
        if(!isSymbol(name))
          throw "let: bad syntax (first element of a binding must be a symbol)";
        if(isNull(binding.cdr))
          throw "let: bad syntax (bindings must be name-value pairs)";
        var value = lispEval(binding.cdr.car);
        newTable[name] = value;
        bindings = bindings.cdr;
      }
      symbol_table.push(newTable);

      var body = expr.cdr.cdr;
      var result = lispNull;
      while(!isNull(body))
      {
        result = lispEval(body.car);
        body = body.cdr;
      }
      symbol_table.pop();
      return result;
    }
    else if(action == "let*")
    {
      var rest = expr.cdr;
      if(isNull(rest))
        throw "let*: bad syntax (let* requires a list of bindings)";
      var bindings = expr.cdr.car;
      if(!isList(bindings))
        throw "let*: bad syntax (let* requires a list of bindings)";

      var newTable = [];
      symbol_table.push(newTable);
      while(!isNull(bindings))
      {
        var binding = bindings.car;
        if(!isList(binding))
          throw "let*: bad syntax (bindings must be lists)";
        var name = binding.car;
        if(!isSymbol(name))
          throw "let*: bad syntax (first element of a binding must be a symbol)";
        if(isNull(binding.cdr))
          throw "let*: bad syntax (bindings must be name-value pairs)";
        var value = lispEval(binding.cdr.car);
        newTable[name] = value;
        bindings = bindings.cdr;
      }

      var body = expr.cdr.cdr;
      var result = lispNull;
      while(!isNull(body))
      {
        result = lispEval(body.car);
        body = body.cdr;
      }
      symbol_table.pop();
      return result;
    }
    else
    {
      var fn = lispEval(action);
      if(!isFunction(fn))
        throw "expected function, given: " + stringRep(fn);
      runContract(fn,expr.cdr);
      //alert("conract passed - running function: " + fn);
      return fn(expr.cdr);
      //alert("function ran, returning");
    }
  }

  return expr;//if nothing else, just return it?
  throw "don't know how to eval: " + stringRep(expr);//dead code
}

function lispAlert(str)
{
  alert(str.toString());
  return lispNull;
}

function lispWrite(str)
{
  if(isString(str))
    document.getElementById("test").innerHTML = str;
  else
    document.getElementById("test").innerHTML = "not yet...";
  return lispNull;

}

addPredefinedFunction("alert!",lispAlert);
addPredefinedFunction("write!",lispWrite);
addPredefinedFunction("cons",cons);
addPredefinedFunction("append",append);
addPredefinedFunction("reverse",reverse);
addPredefinedFunctionVararg("list",list);
addPredefinedFunction("car",car);
addPredefinedFunction("cdr",cdr);
addPredefinedFunction("pair?",isPair);
addPredefinedFunction("list?",isList);
addPredefinedFunction("length",listLength);
addPredefinedFunction("null?",isNull);
addPredefinedFunction("symbol?",isSymbol);
addPredefinedFunction("number?",isNumber);
addPredefinedFunction("bool?",isBool);
addPredefinedFunction("function?",isFunction);
addPredefinedFunction("string?",isString);
addPredefinedFunction("contract?",isContract);
addPredefinedFunctionVararg("contract",makeContract);
addPredefinedFunction("contract-vararg",makeContractVararg);
addPredefinedFunction("attach-contract",attachContract);
addPredefinedFunction("symbol->string",symbolToString);
addPredefinedFunctionVararg("concat",concat);
run("(attach-contract concat (contract-vararg string?))");
addPredefinedFunctionVararg("+",add);
addPredefinedFunctionVararg("-",sub);
addPredefinedFunctionVararg("*",mul);
addPredefinedFunctionVararg("/",div);
addPredefinedFunctionVararg("=",num_eq);
addPredefinedFunctionVararg("<",num_lt);
addPredefinedFunctionVararg(">",num_gt);
addPredefinedFunctionVararg("<=",num_lte);
addPredefinedFunctionVararg(">=",num_gte);
addPredefinedFunctionVararg("and",and);
addPredefinedFunctionVararg("or",or);
addPredefinedFunction("symbol-equal?",symbol_equal);
run("(define caar (lambda (lst) (car (car lst))))");
run("(define caaar (lambda (lst) (car (car (car lst)))))");
run("(define caaaar (lambda (lst) (car (car (car (car lst))))))");
run("(define cadr (lambda (lst) (car (cdr lst))))");
run("(define caddr (lambda (lst) (car (cdr (cdr lst)))))");
run("(define cadddr (lambda (lst) (car (cdr (cdr (cdr lst))))))");
run("(define cddr (lambda (lst) (cdr (cdr lst))))");
run("(define cdddr (lambda (lst) (cdr (cdr (cdr lst)))))");
run("(define cddddr (lambda (lst) (cdr (cdr (cdr (cdr lst))))))");
run("(define first (lambda (lst) (car lst)))");
run("(define rest (lambda (lst) (cdr lst)))");
run("(define anything? (lambda (x) #t))");
run("(define equal? (lambda (a b) (if (and (number? a) (number? b)) (= a b) (if (and (bool? a) (bool? b)) (if a (if b #t #f) (if b #f #t)) (if (and (symbol? a) (symbol? b)) (symbol-equal? a b) #f)))))")
run("(define map (lambda (fn lst) (if (null? lst) null (cons (fn (car lst)) (map fn (cdr lst))))))");
run("(define reduce (lambda (fn val lst) (if (null? lst) val (reduce fn (fn val (car lst)) (cdr lst)))))");
run("(define filter (lambda (fn lst) (if (null? lst) null (if (fn (car lst)) (cons (car lst) (filter fn (cdr lst))) (filter fn (cdr lst))))))");
run("(define take-while (lambda (fn lst) (if (null? lst) null (if (fn (car lst)) (cons (car lst) (take-while fn (cdr lst))) null))))"); 
run("(define drop-while (lambda (fn lst) (if (null? lst) null (if (fn (car lst)) (drop-while fn (cdr lst)) lst))))");
//run("(define html->string (lambda (lst) (if (string? lst) lst (if (null? (cdr lst)) (concat \"<\" (symbol->string (car lst)) \" />\") (concat \"<\" (symbol->string (car lst)) \">\" (reduce concat \"\" (map html->string (cdr lst))) \"</\" (symbol->string (car lst)) \">\"))))) ");
run("(define html->string (lambda (lst) (if (string? lst) lst (if (null? (cdr lst)) (concat \"<\" (symbol->string (car lst)) \" />\") (concat \"<\" (symbol->string (car lst)) \">\" (reduce concat \"\" (map html->string (cdr lst))) \"</\" (symbol->string (car lst)) \">\")))))  ");
run("(attach-contract map (contract function? list?))");
run("(attach-contract reduce (contract function? anything? list?))");
run("(attach-contract filter (contract function? list?))");
run("(attach-contract drop-while (contract function? list?))");
run("(attach-contract take-while (contract function? list?))");
run("(attach-contract + (contract-vararg number?))");
run("(attach-contract - (contract-vararg number?))");
run("(attach-contract * (contract-vararg number?))");
run("(attach-contract / (contract-vararg number?))");
run("(attach-contract = (contract-vararg number?))");
run("(attach-contract < (contract-vararg number?))");
run("(attach-contract <= (contract-vararg number?))");
run("(attach-contract > (contract-vararg number?))");
run("(attach-contract >= (contract-vararg number?))");
run("(attach-contract car (contract list?))");
run("(attach-contract cdr (contract list?))");
run("(attach-contract append (contract list? list?))");
run("(attach-contract and (contract-vararg bool?))");
run("(attach-contract or (contract-vararg bool?))");
run("(attach-contract symbol-equal? (contract symbol? symbol?))");
run("(attach-contract alert! (contract string?))");

function run(str)
{
  var parser = new Parser(str);
  var results = [];
  do
  {
    parser.prime();
    results.push(stringRep(lispEval(parser.parse())));
  } while(!parser.empty());
  return results;
}
