/* ═══════════════════════════════════════════════════════════════
   ESCUDO — núcleo compartilhado (V0)
   Fonte única da verdade para contagens e notas.

   Princípio: cada formulário salvo = 1 LANÇAMENTO em
   escudo/lancamentos/<id>. Totais (inspeções, descontos, ideias)
   e a média geral saem da contagem desses lançamentos — nunca do
   número de pessoas incluídas. O id é fixo por preenchimento,
   então toque duplo / reenvio NÃO duplica a contagem.

   Tipos: 'inspecao' | 'feedback' | 'desconto' | 'ideia'
   (feedback de atividade também conta como inspeção realizada)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var ESCUDO = window.ESCUDO = {};
  ESCUDO.VERSION = 'V0.1';

  // Totais acumulados ANTES da V0 (informados pela Malena em 14/10/2026).
  // Para ajustar, mude só aqui.
  ESCUDO.BASE = { inspecoes: 195, descontos: 21 };

  var PEND_KEY = 'esc_lanc_pend';
  var MESES_F  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  ESCUDO.MESES_F = MESES_F;

  /* ── utilitários ── */
  function safe(n){ return (n||'').replace(/[ .#$§\[\]]/g,'_'); }
  function arr(x){ return Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.keys(x).map(function(k){return x[k];}) : []); }
  function num(v){ return typeof v === 'number' && isFinite(v); }
  function mean(a){ return a.length ? a.reduce(function(s,v){return s+v;},0)/a.length : 0; }
  ESCUDO.safe = safe;
  ESCUDO.arr  = arr;
  ESCUDO.newId = function(){ return 'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); };

  /* ── gravação (idempotente, com fila offline) ── */
  function readPend(){ try{ return JSON.parse(localStorage.getItem(PEND_KEY)||'[]'); }catch(e){ return []; } }
  function writePend(a){ try{ localStorage.setItem(PEND_KEY, JSON.stringify(a)); }catch(e){} }

  var flushing = false;
  ESCUDO.flush = async function(){
    if(flushing || !window.$FB || !window.$FB.set) return;
    var q = readPend(); if(!q.length) return;
    flushing = true;
    var sent = {};
    try{
      var f = window.$FB;
      for(var i=0;i<q.length;i++){
        try{ await f.set(f.ref(f.db,'escudo/lancamentos/'+q[i].id), q[i]); sent[q[i].id]=1; }
        catch(e){ console.warn('ESCUDO.flush falhou', q[i].id, e); }
      }
    } finally {
      writePend(readPend().filter(function(e){ return !sent[e.id]; }));
      flushing = false;
    }
  };

  /* Registra 1 lançamento. ev = {id?, tipo, mes, pessoas:[nomes], ...}
     Passe sempre o MESMO id para o mesmo preenchimento (ver newId). */
  ESCUDO.log = function(ev){
    ev = JSON.parse(JSON.stringify(ev)); // remove undefined (Firebase recusa)
    ev.id = ev.id || ESCUDO.newId();
    ev.ts = ev.ts || new Date().toISOString();
    ev.v  = ESCUDO.VERSION;
    var q = readPend().filter(function(e){ return e.id !== ev.id; });
    q.push(ev); writePend(q);
    ESCUDO.flush();
    return ev.id;
  };
  setInterval(function(){ ESCUDO.flush(); }, 5000);

  /* ── leitura ── */
  ESCUDO.eventos = function(lancs){
    return arr(lancs).filter(function(e){ return e && e.id && e.tipo; });
  };
  ESCUDO.isInsp = function(e){ return e.tipo === 'inspecao' || e.tipo === 'feedback'; };
  function evMes(e){ return typeof e.mes === 'number' ? e.mes : parseInt(e.mes,10); }
  function evPessoas(e){ return arr(e.pessoas).map(safe); }

  // instante do primeiro lançamento da V0 (tudo antes disso é "legado")
  ESCUDO.corte = function(lancs){
    var ts = ESCUDO.eventos(lancs).map(function(e){return e.ts;}).filter(Boolean).sort();
    return ts.length ? ts[0] : null;
  };

  // notas (critérios 1–5) de um lançamento
  function evNotas(e){ return arr(e.notas).filter(function(v){ return num(v) && v > 0; }); }

  /* Notas de UMA pessoa em um mês (ou todos: mes<0).
     Se há lançamentos da V0 → usa-os (1 amostra por lançamento);
     senão cai no dado legado S["Nome§mes"]. */
  ESCUDO.unidadesPessoa = function(nome, mes, lancs, S){
    var sn = safe(nome), nums = [], n = 0;
    var meses = mes >= 0 ? [mes] : [0,1,2,3,4,5,6,7,8,9,10,11];
    var evs = ESCUDO.eventos(lancs).filter(function(e){
      return ESCUDO.isInsp(e) && evPessoas(e).indexOf(sn) >= 0;
    });
    meses.forEach(function(m){
      var doMes = evs.filter(function(e){ return evMes(e) === m; });
      if(doMes.length){
        doMes.forEach(function(e){ nums = nums.concat(evNotas(e)); n++; });
      } else {
        var leg = S && S[sn+'§'+m];
        if(leg){
          var vs = arr(leg).filter(function(v){ return num(v) && v > 0; });
          if(vs.length || arr(leg).length){ nums = nums.concat(vs); n++; }
        }
      }
    });
    return { nums: nums, n: n };
  };

  /* Mesmo cálculo para uma EQUIPE (lista de nomes): cada lançamento
     conta UMA vez, mesmo que vários membros tenham sido avaliados nele. */
  ESCUDO.unidadesEquipe = function(nomes, mes, lancs, S){
    var sns = nomes.map(safe), nums = [], n = 0;
    var meses = mes >= 0 ? [mes] : [0,1,2,3,4,5,6,7,8,9,10,11];
    var evs = ESCUDO.eventos(lancs).filter(function(e){
      return ESCUDO.isInsp(e) && evPessoas(e).some(function(p){ return sns.indexOf(p) >= 0; });
    });
    meses.forEach(function(m){
      var doMes = evs.filter(function(e){ return evMes(e) === m; });
      if(doMes.length){
        doMes.forEach(function(e){ nums = nums.concat(evNotas(e)); n++; });
      } else {
        sns.forEach(function(sn){
          var leg = S && S[sn+'§'+m];
          if(leg){
            var vs = arr(leg).filter(function(v){ return num(v) && v > 0; });
            nums = nums.concat(vs); n++;
          }
        });
      }
    });
    return { nums: nums, n: n };
  };

  /* Ideias do legado, contadas por IDEIA e não por pessoa:
     o formulário antigo gravava uma cópia por pessoa envolvida, todas
     com o mesmo texto/avaliador/mês — agrupamos para achar o real. */
  function ideiasLegado(ideiasValor, S_BONUS, corte){
    var vals = arr(ideiasValor);
    if(!vals.length) return Object.keys(S_BONUS||{}).length;
    var grupos = {};
    vals.forEach(function(d){
      if(!d) return;
      if(corte && d.ts && d.ts >= corte) return; // já está no log
      var t = d.ideiasTexto || {};
      var k = [d.mes, d.avaliador||'', arr(t.sst).join('|'), arr(t.ma).join('|'), d.sst||0, d.ma||0].join('¦');
      grupos[k] = 1;
    });
    return Object.keys(grupos).length;
  }

  /* Estatísticas do painel.
     in: { lancs, mes(-1=todos), S, S_BONUS, ideiasValor, counters:{insp,desc} } */
  ESCUDO.stats = function(o){
    var mes = o.mes, lancs = o.lancs, S = o.S || {}, c = o.counters || {};
    var evs = ESCUDO.eventos(lancs);
    var sel = function(e){ return mes < 0 || evMes(e) === mes; };
    var nInsp = evs.filter(function(e){ return ESCUDO.isInsp(e) && sel(e); }).length;
    var nDesc = evs.filter(function(e){ return e.tipo === 'desconto' && sel(e); }).length;
    var nIdea = evs.filter(function(e){ return e.tipo === 'ideia' && sel(e); }).length;
    var est = { insp:false, desc:false, ideias:false };
    var insp, desc, ideias;

    if(mes < 0){
      insp = ESCUDO.BASE.inspecoes + nInsp;
      desc = ESCUDO.BASE.descontos + nDesc;
      ideias = ideiasLegado(o.ideiasValor, o.S_BONUS, ESCUDO.corte(lancs)) + nIdea;
    } else {
      insp = nInsp;
      if(!insp){ // mês anterior à V0 → estimativa a partir do legado
        insp = (c.insp && c.insp[mes]) || Object.keys(S).filter(function(k){ return k.slice(-(''+mes).length-1) === '§'+mes; }).length;
        est.insp = insp > 0;
      }
      desc = nDesc;
      if(!desc){
        desc = (c.desc && c.desc[mes]) || Object.keys(o.S_DESC||{}).filter(function(k){ return k.slice(-(''+mes).length-2) === '__'+mes; }).length;
        est.desc = desc > 0;
      }
      ideias = nIdea;
      if(!ideias){
        var vi = arr(o.ideiasValor).filter(function(d){ return d && evMes(d) === mes; });
        var g = {}; vi.forEach(function(d){ var t=d.ideiasTexto||{}; g[[d.avaliador||'',arr(t.sst).join('|'),arr(t.ma).join('|')].join('¦')]=1; });
        ideias = Object.keys(g).length || Object.keys(o.S_BONUS||{}).filter(function(k){ return k.slice(-(''+mes).length-2) === '__'+mes; }).length;
        est.ideias = ideias > 0;
      }
    }

    // Média geral = média das notas POR INSPEÇÃO (cada lançamento pesa 1,
    // não importa quantas pessoas foram avaliadas nele).
    var amostras = [];
    var meses = mes >= 0 ? [mes] : [0,1,2,3,4,5,6,7,8,9,10,11];
    var sn = o.nomes ? o.nomes.map(safe) : null; // filtro opcional por equipe
    meses.forEach(function(m){
      var doMes = evs.filter(function(e){
        return ESCUDO.isInsp(e) && evMes(e) === m && num(e.nota) &&
               (!sn || evPessoas(e).some(function(p){ return sn.indexOf(p) >= 0; }));
      });
      if(doMes.length){ doMes.forEach(function(e){ amostras.push(e.nota); }); return; }
      Object.keys(S).forEach(function(k){
        var p = k.split('§'); if(parseInt(p[1],10) !== m) return;
        if(sn && sn.indexOf(p[0]) < 0) return;
        var vs = arr(S[k]).filter(function(v){ return num(v) && v > 0; });
        if(vs.length) amostras.push(mean(vs));
      });
    });
    return { insp:insp, desc:desc, ideias:ideias, media: amostras.length ? mean(amostras) : null, est:est };
  };

  /* Total de lançamentos por mês (para o histórico) */
  ESCUDO.inspPorMes = function(mes, lancs, S, counters){
    var n = ESCUDO.eventos(lancs).filter(function(e){ return ESCUDO.isInsp(e) && evMes(e) === mes; }).length;
    if(n) return { n:n, est:false };
    var c = (counters && counters.insp && counters.insp[mes]) || 0;
    if(!c) c = Object.keys(S||{}).filter(function(k){ return parseInt(k.split('§')[1],10) === mes; }).length;
    return { n:c, est:c>0 };
  };

  /* Carrega lançamentos ao vivo. cb(objeto) é chamado a cada mudança. */
  ESCUDO.watch = function(cb){
    var f = window.$FB; if(!f) return;
    f.onValue(f.ref(f.db,'escudo/lancamentos'), function(snap){ cb(snap.exists() ? snap.val() : {}); });
  };
})();
