/*
A -> ...
E -> A E
E -> @
E -> ( S )
E -> ( S ) *
O -> E | O
O -> E

|,+,*

*/
function add(node, k,v)
{
  if(!Array.isArray(v)){
    v=[v];
  }
  if(node[k]===undefined){
    node[k]=v;
  }else{
    [].push.apply(node[k],v);
  }
}

function swap(dict2,str,x)
{
  var y=dict2.indexOf(str);
  var tmp=dict2[x];
  dict2[x]=dict2[y];
  dict2[y]=tmp;
}

function getL(letter)
{
  return function(obj){return obj[letter];};
}

function walk(nfa,array,letter,repeat)
{
  var f=(repeat?array.slice(0):Array());
  var queue=array.slice(0);
  while(queue.length!==0){
    //pivot
    var nodee=letter(nfa[queue.pop()]);
    if(nodee===undefined){
      continue;
    }
    //potential
    for(var i=0;i<nodee.length;i++){
      for(var j=0;j<f.length;j++){
        if(f[j]===nodee[i]){
          break;
        }
      }
      //new
      if(j===f.length){
        f.push(nodee[i]);
        if(repeat){
          queue.push(nodee[i]);
        }
      }
    }
  }
  return f.sort();
}

function map(dfa,dict1,dict2)
{
  var f=Array.isArray(dict2)?Array(dict2.length):{};
  dict2.forEach(function(v,i){
    f[i]={};
    var obj=dfa[v];
    for(var k in obj){
      if(!obj.hasOwnProperty(k)) continue;
      if(dict1[obj[k]]!==undefined){
        f[i][k]=dict1[obj[k]];
      }
    }
  });
  return f;
}

var language=
{
  "empty":'@',
  "left":'(',
  "right":')',
  "escape":'\\',
  "star":'*',
  "or":'|'
};

function regex_to_tree(str)
{
  var i=0;
  var E,A,O;
  var f;
  E=function()
  {
    //console.log("E: "+i+", "+str[i]);
    switch(str[i]){
    case language.empty:
      i++;
      f=["e"];
      break;
    case language.escape:
      i++;
      if(str[i]===undefined) throw new Error("unexpected EOF");
      f=str[i++];
      break;
    case language.left:
      i++;
      f=O();
      if(str[i]!==language.right){
        throw new Error("bracket not match: "+i);
      }
      i++;
      break;
    case undefined:
    case language.right:
    case language.or:
    case language.star:
      throw new Error("Unexpected char.");
    default:
      f=str[i++];
    }
    if(str[i]===language.star){
      i++;
      return ["*",f];
    }else{
      return f;
    }
  };
  A=function()
  {
    //console.log("A: "+i);
    var f=['+',E()];

    while(true){
      switch(str[i]){
      case language.star:
        throw new Error("Unexpected star.");
      case language.right:
      case language.or:
      case undefined:
        if(f.length===2){
          return f[1];
        }
        return f;
      /*
      case language.left:
      case language.empty:
      */
      default:
        f.push(E());
      }
    }
  };
  O=function()
  {
    //console.log("O: "+i);
    var f=['|',A()];
    while(true){
      switch(str[i]){
      case language.left:
      case language.empty:
      case language.star:
        throw new Error("Unexpected char.");
      case language.right:
      case undefined:
        if(f.length===2){
          return f[1];
        }
        return f;
      /*
      */
      case language.or:
        i++;
        f.push(A());
      }
    }
  };
  return str===""?undefined:O();
}

function tree_to_nfa(tree)
{
  var nodes=
  [
    {
    },
    {
    }
  ];
  if(!tree) return nodes;
  //special table entry: end,epi
  if(tree===undefined)
  {
    nodes[0].end=[1];
    return nodes;
  }
  function rec(tr,start,end)
  {
    var i;
    if((!Array.isArray(tr))||tr[0]=='e')
    {
      if(Array.isArray(tr)&&tr[0]=='e'){
        tr='epi';
      }
      add(nodes[start],tr,end);
      return;
    }
    switch(tr[0])
    {
    case '+':
      var start2=start;
      for(i=1;i<tr.length-1;i++){
        var end2=nodes.length;
        nodes.push({});
        rec(tr[i],start2,end2);
        start2=end2;
      }
      rec(tr[i],start2,end);
      break;
    case '|':
      for(i=1;i<tr.length;i++){
        rec(tr[i],start,end);
      }
      break;
    case '*':
      var size=nodes.length;
      nodes.push({},{});
      rec(tr[1],size,size+1);
      add(nodes[start],'epi',size);
      add(nodes[size+1],'epi',size);
      add(nodes[size],'epi',end);
    }
  }

  rec(tree,0,1);
  return nodes;
}

function nfa_to_dfa(nfa)
{
  var i;


  //new node queue
  var queue=[walk(nfa,[0],getL('epi'),true)];
  var f={};
  var counter=1;
  while(queue.length!==0){
    var array=queue.pop();
    var arrays=array.join(",");
    var f2=f[arrays]={};
    for(i=0;i<array.length;i++){
      var node=nfa[array[i]];
      for(var key in node){
        if(!node.hasOwnProperty(key)) continue;
        if(key==='epi') continue;
        if(f2[key]!==undefined) continue;
        var array2=walk(
          nfa,
          walk(nfa,array,getL(key),false),
          getL('epi'),
          true
        );
        var array2s=array2.join(',');
        f2[key]=array2s;
        if(f[array2s]===undefined){
          queue.push(array2);
        }
      }
    }
    if(array.indexOf(1)!==-1){
      f2.end='end';
    }
  }
  f.end={};
  var dict2=Object.keys(f);//int > str
  swap(dict2,walk(nfa,[0],getL('epi'),true).join(','),0);
  swap(dict2,'end',1);
  var dict1={};//str > int
  for(i=0;i<dict2.length;i++){
    dict1[dict2[i]]=i;
  }
  

  var ff=map(f,dict1,dict2);
  return ff;
}

function inverse_fa(dfa)
{
  var dfa2=Array(dfa.length);
  var i,k;
  for(i=0;i<dfa.length;i++){
    dfa2[i]={};
  }
  for(i=0;i<dfa.length;i++){
    for(k in dfa[i]){
      if(!dfa[i].hasOwnProperty(k)) continue;
      add(dfa2[dfa[i][k]],k,i);
    }
  }
  return dfa2;
}

function reduce_dfa1(dfa)
{
  var i,k;
  var dfa2=inverse_fa(dfa);
  var array=walk(
    dfa2,
    [1],
    function(obj){
      return [].concat.apply([],
        Object.keys(obj).map(function(k){
          return obj[k];
        })
      );
    },
    true
  );
  if(array[0]!==0){
    return [{},{}];
  }
  var dict=Array(dfa.length);
  var f=Array(array.length);
  for(i=0;i<array.length;i++){
    dict[array[i]]=i;
    f[i]={};
  }
  
  for(i=0;i<array.length;i++){
    f[i]={};
    var obj=dfa[array[i]];
    for(k in obj){
      if(!obj.hasOwnProperty(k)) continue;
      if(dict[obj[k]]!==undefined){
        f[i][k]=dict[obj[k]];
      }
    }
  }
  return f;
}

function reduce_dfa2(dfa)
{
  if(dfa.length===2) return dfa;

  var i;
  var Ps=Array(dfa.length);//index > group index
  var W=Array(dfa.length);
  for(i=0;i<dfa.length;i++){
    Ps[i]=0;
    W[i]=i;
  }
  var Pn=1;//number of groups: all
  var dfa2=inverse_fa(dfa);
  function index_to_keys2(i)
  {
    return Object.keys(dfa2[i]);
  }
  function extend(s,v)//push array
  {
    for(var vv in v){
      if(v.hasOwnProperty(vv)){
        s[v[vv]]=true;
      }
    }
    return s;
  }
  //var Sig=W.map(index_to_keys2).reduce(extend,{});
  //Sig=Object.keys(Sig);//array of all alphas
  W=[W.join(',')];//queue
  function indexes_to_ukeys2(A)
  {
    return Object.keys(A
      .map(index_to_keys2)
      .reduce(extend,{}));
  }

  function parti(Pi,X)
  {
    var i=0;
    var f1=[],f2=[],f3=[];
    for(var n1=0;n1<Ps.length;n1++){
      //console.log(n1+": "+Ps[n1]);
      if(Ps[n1]!==Pi){
        continue;
      }
      while(X[i]<n1){
        i++;
      }
      if(X[i]===n1){
        f1.push(n1);
      }else{
        f2.push(n1);
      }
      f3.push(n1);
    }
    //console.log(JSON.stringify([Pi,X,Ps,Pn,f1,f2,f3]));
    return [f1,f2,f3];
  }

  while(W.length!==0){

    //console.log(W);
    var A=W.pop().split(',');
    var cs=indexes_to_ukeys2(A);
    //console.log('A: '+JSON.stringify([A,cs]));
    for(var ci=0;ci<cs.length;ci++){
      var c=cs[ci];
      var X=walk(dfa2,A,getL(c),false);
      for(var Pi=0;Pi<Pn;Pi++){
        var ptt=parti(Pi,X);
        //console.log("ptt: "+Pi+" "+JSON.stringify([c,ptt,Ps,X]));
        if(ptt[0].length!==0&&ptt[1].length!==0){
          for(var ptt1i=0;ptt1i<ptt[1].length;ptt1i++){
            Ps[ptt[1][ptt1i]]=Pn;
          }
          Pn++;
          
          var Wi=W.indexOf(ptt[2].join(','));
          if(Wi!==-1){
            W.splice(Wi,1,ptt[0].join(','),ptt[1].join(','));
          }else{
            if(ptt[0].length>=ptt[1].length){
              W.push(ptt[0].join(','));
            }else{
              W.push(ptt[1].join(','));
            }
          }
        }
      }
    }
  }
  //console.log("Ps: "+JSON.stringify(Ps));
  var tmp=Array(Pn);
  for(i=0;i<Pn;i++){
    tmp[i]=i;
  }
  tmp[Ps[0]]=0;
  tmp[0]=Ps[0];
  tmp[Ps[1]]=1;
  tmp[tmp[1]]=Ps[1];
  //console.log(tmp);
  
  Ps=Ps.map(function(e){
    return tmp[e];
  });
  //console.log("Ps: "+JSON.stringify(Ps));
  
  var Pin=Array(Pn);
  for(i=0;i<Ps.length;i++){
    if(Pin[Ps[i]]===undefined){
      Pin[Ps[i]]=i;
    }
  }

  return map(dfa,Ps,Pin);
}

function parse(dfa)
{
  return function(string){
    var si=0;
    for(var i=0;si!==undefined&&i<string.length;i++){
      si=dfa[si][string[i]];
      //console.log(si);
    }
    return si!==undefined&&dfa[si].end===1;
  };
}

function fa_to_dot(fa) //TODO broken
{
  var i;
  var table=Array(fa.length*fa.length);
  
  for(i=0;i<fa.length*fa.length;i++){
    table[i]=[];
  }
  for(i=0;i<fa.length;i++){
    for(var k in fa[i]){
      if(!fa[i].hasOwnProperty(k)) continue;
      var tmp=fa[i][k];
      if(!Array.isArray(tmp)){
        tmp=[tmp];
      }
      for(var j=0;j<tmp.length;j++){
        table[i*fa.length+tmp[j]].push(escape(k));
      }
    }
  }
  table=table.map(function(v,i){
    return v.length===0?"":("  "+(i/fa.length|0)+" -> "+(i%fa.length)+" [label=\""+v.join(',')+"\"];\n");
  });
  var f="";
  f+="digraph G{\n";
  f+="  0 [color=\"red\"]\n";
  f+="  1 [color=\"red\"]\n";
  f+=table.join('');
  f+="}";
  return f;
}


var t1t=regex_to_tree("(a|b)*ababab");
console.log(t1t);
var t1n=tree_to_nfa(t1t);
console.log(t1n);
var t1d=nfa_to_dfa(t1n);
console.log(t1d);
var t1a=reduce_dfa1(t1d);
console.log(t1a);
var t1b=reduce_dfa2(t1a);
console.log(t1b);
var t1p=parse(t1b);
console.log("parse: ");
console.log(t1p("ababaababab"));
var t1g=fa_to_dot(t1b);
console.log("t1g");
console.log(t1g);
var t2d=[
  {'a':2,'b':3},
  {},
  {'end':1,'a':4},
  {'end':1},
  {}
];
if(exports!==undefined){
  console.log("t2d: ");
  console.log(t2d);
  var t2din=inverse_fa(t2d);
  console.log("t2din: ");
  console.log(t2din);
  var t2a=reduce_dfa1(t2d);
  console.log("t2a");
  console.log(t2a);
  var t2b=reduce_dfa2(t2a);
  console.log("t2b");
  console.log(t2b);
  var t2g=fa_to_dot(t2b);
  console.log("t2g");
  console.log(t2g);
}






